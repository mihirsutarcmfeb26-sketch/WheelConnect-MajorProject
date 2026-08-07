import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MapComponent from './MapComponent';
import LocationPermissionDialog from './LocationPermissionDialog';

const ServiceCenterMap = ({ onSelectCenter, selectedCenterId }) => {
  const [centers, setCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('prompt'); // 'prompt', 'granted', 'denied', 'unavailable'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'name'
  const [viewMode, setViewMode] = useState('map'); // 'map', 'list', 'both'
  const [selectedCenter, setSelectedCenter] = useState(null);

  const fetchUserLocationAndCenters = () => {
    setLoading(true);
    setError('');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocationStatus('granted');
          fetchCenters(coords.lat, coords.lng);
        },
        (err) => {
          console.warn('Geolocation access denied or unavailable:', err.message);
          setLocationStatus('denied');
          fetchCenters(null, null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('unavailable');
      fetchCenters(null, null);
    }
  };

  useEffect(() => {
    fetchUserLocationAndCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCenters = async (lat, lng) => {
    setLoading(true);
    try {
      let url = '/api/service-centers/map';
      if (lat != null && lng != null) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      const resp = await api.get(url);
      setCenters(resp.data);
      if (resp.data.length > 0 && selectedCenterId) {
        const found = resp.data.find((c) => c.id === selectedCenterId);
        if (found) setSelectedCenter(found);
      }
    } catch (err) {
      console.error('Failed to load service centers map data:', err);
      // Fallback to active service centers endpoint
      try {
        const fallbackResp = await api.get('/api/service-centers/active');
        const formatted = fallbackResp.data.map((sc) => ({
          ...sc,
          availableServices: ['General Inspection', 'Full Service', 'Brake Check'],
          workingHours: '09:00 AM - 08:00 PM',
        }));
        setCenters(formatted);
      } catch (fErr) {
        setError('Unable to load service center list. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Centers
  useEffect(() => {
    let result = [...centers];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.address && c.address.toLowerCase().includes(term))
      );
    }

    if (sortBy === 'distance') {
      result.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredCenters(result);
  }, [centers, searchTerm, sortBy]);

  const handleSelect = (center) => {
    setSelectedCenter(center);
    if (onSelectCenter) {
      onSelectCenter(center.id, center);
    }
  };

  const handleGetDirections = (center) => {
    let dest = `${center.latitude},${center.longitude}`;
    if (!center.latitude || !center.longitude) {
      dest = encodeURIComponent(center.address || center.name);
    }
    let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="glass-panel p-4 mb-4">
      {/* HEADER & CONTROLS */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
        <div>
          <h4 className="fw-bold text-white mb-1">
            <i className="bi bi-geo-alt-fill text-danger me-2"></i>
            Active Service Centers & Live Map
          </h4>
          <p className="text-muted small mb-0">
            Locate nearby authorized service centers, view available services, and get driving directions.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => setViewMode('map')}
          >
            <i className="bi bi-map me-1"></i> Map View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => setViewMode('list')}
          >
            <i className="bi bi-list-ul me-1"></i> List View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'both' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => setViewMode('both')}
          >
            <i className="bi bi-layout-split me-1"></i> Split View
          </button>
        </div>
      </div>

      {/* LOCATION PERMISSION BANNER */}
      <LocationPermissionDialog
        status={locationStatus}
        userLocation={userLocation}
        onRetry={fetchUserLocationAndCenters}
      />

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      {/* FILTER & SEARCH BAR */}
      <div className="row g-2 mb-3">
        <div className="col-md-7 col-lg-8">
          <div className="input-group">
            <span className="input-group-text bg-dark border-secondary text-muted">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control bg-dark text-white border-secondary"
              placeholder="Search center by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="col-md-5 col-lg-4">
          <div className="input-group">
            <span className="input-group-text bg-dark border-secondary text-muted">Sort By</span>
            <select
              className="form-select bg-dark text-white border-secondary"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="distance">Distance (Nearest First)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="small mb-0">Loading map and nearby service centers...</p>
        </div>
      ) : (
        <div className="row g-3">
          {/* MAP DISPLAY */}
          {(viewMode === 'map' || viewMode === 'both') && (
            <div className={viewMode === 'both' ? 'col-lg-7' : 'col-12'}>
              <MapComponent
                centers={filteredCenters}
                userLocation={userLocation}
                selectedCenter={selectedCenter}
                onSelectCenter={handleSelect}
                height={viewMode === 'both' ? '460px' : '380px'}
              />
            </div>
          )}

          {/* LIST DISPLAY */}
          {(viewMode === 'list' || viewMode === 'both') && (
            <div className={viewMode === 'both' ? 'col-lg-5' : 'col-12'}>
              <div
                className="d-flex flex-column gap-2 overflow-auto pe-1"
                style={{ maxHeight: viewMode === 'both' ? '460px' : '500px' }}
              >
                {filteredCenters.length === 0 ? (
                  <div className="card bg-dark text-white border border-secondary p-4 text-center">
                    <i className="bi bi-geo-alt-fill display-6 text-muted mb-2"></i>
                    <p className="text-muted mb-0">No active service centers match your criteria.</p>
                  </div>
                ) : (
                  filteredCenters.map((c) => {
                    const isSelected = selectedCenter?.id === c.id || selectedCenterId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`card text-white p-3 border cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary bg-opacity-25' : 'border-secondary bg-dark'
                        }`}
                        onClick={() => handleSelect(c)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-bold text-white mb-0">{c.name}</h6>
                            <span className="text-muted small d-block">{c.address}</span>
                          </div>
                          {c.distanceKm != null && (
                            <span className="badge bg-info text-dark">
                              {c.distanceKm} km
                            </span>
                          )}
                        </div>

                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {c.availableServices &&
                            c.availableServices.slice(0, 3).map((srv, idx) => (
                              <span key={idx} className="badge bg-secondary extra-small fw-normal">
                                {srv}
                              </span>
                            ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary">
                          <span className="text-success small fw-semibold">
                            <i className="bi bi-telephone me-1"></i> {c.phone || 'Available'}
                          </span>

                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-info btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGetDirections(c);
                              }}
                            >
                              <i className="bi bi-sign-turn-right me-1"></i> Directions
                            </button>
                            {onSelectCenter && (
                              <button
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-primary'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(c);
                                }}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceCenterMap;
