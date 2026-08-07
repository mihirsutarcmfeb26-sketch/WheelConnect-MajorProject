import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { loadLeaflet, createPinIcon } from '../utils/leafletLoader';

const LocationPickerModal = ({ onClose, onConfirm, initialLat = 19.0760, initialLng = 72.8777 }) => {
  const [selectedCoords, setSelectedCoords] = useState({ lat: initialLat, lng: initialLng });
  const [addressComponents, setAddressComponents] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Reverse geocode helper - always goes through the backend's single reverse-geocode
  // endpoint (real OpenStreetMap/Google lookup), the exact same one the "Use Current
  // Location" flow and the customer map both use, so every part of the app shares one
  // consistent location system.
  const performReverseGeocode = async (lat, lng) => {
    setLoadingGeocode(true);
    try {
      const resp = await api.get(`/api/service-centers/reverse-geocode?lat=${lat}&lng=${lng}`);
      setAddressComponents({
        address: resp.data.address || '',
        city: resp.data.city || '',
        state: resp.data.state || '',
        pincode: resp.data.pincode || '',
      });
    } catch (bErr) {
      console.error('Reverse geocode failed:', bErr);
      setAddressComponents({
        address: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: '',
        state: '',
        pincode: '',
      });
    } finally {
      setLoadingGeocode(false);
    }
  };

  const moveMarkerTo = (lat, lng) => {
    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() < 13 ? 14 : mapInstanceRef.current.getZoom());
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
    performReverseGeocode(lat, lng);
  };

  // Search a free-text location (city, area, landmark, address) via the backend's real
  // geocoding endpoint (Nominatim / Google) - no hardcoded city list.
  const handleSearchLocation = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError('');
    setLoadingGeocode(true);

    try {
      const resp = await api.get(`/api/service-centers/geocode?query=${encodeURIComponent(searchQuery.trim())}`);
      const { latitude, longitude, address, city, state, pincode } = resp.data;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error('No coordinates in response');
      }

      setSelectedCoords({ lat, lng });
      setAddressComponents({
        address: address || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 14);
      }
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      }
    } catch (err) {
      console.warn('Location search failed:', err);
      setSearchError(
        err.response?.data?.message || `Couldn't find "${searchQuery.trim()}". Try a more specific search, or tap the map directly.`
      );
    } finally {
      setLoadingGeocode(false);
    }
  };

  // Initial reverse geocode for the starting pin position
  useEffect(() => {
    performReverseGeocode(initialLat, initialLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Leaflet and initialize the interactive picker map
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapContainerRef.current) return;
        leafletRef.current = L;

        const map = L.map(mapContainerRef.current, {
          center: [selectedCoords.lat, selectedCoords.lng],
          zoom: 14,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
          draggable: true,
          icon: createPinIcon(L, { color: '#0d6efd', size: 40 }),
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          moveMarkerTo(pos.lat, pos.lng);
        });

        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          moveMarkerTo(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
        setMapReady(true);
      })
      .catch((err) => {
        console.error('Failed to load map library:', err);
        if (!cancelled) setMapLoadError(err.message || 'Failed to load the map.');
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = () => {
    onConfirm({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      address: addressComponents.address,
      city: addressComponents.city,
      state: addressComponents.state,
      pincode: addressComponents.pincode,
    });
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          <div className="modal-header border-secondary py-2">
            <h5 className="modal-title fw-bold text-info">
              <i className="bi bi-map-fill me-2"></i>Select Location on Map
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-3">
            {/* Search location bar */}
            <form onSubmit={handleSearchLocation} className="mb-2">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-secondary text-white border-0"
                  placeholder="Search city, area, or landmark (e.g. Bandra West, Mumbai)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-info px-4" disabled={loadingGeocode}>
                  <i className="bi bi-search me-1"></i>Search Location
                </button>
              </div>
            </form>
            {searchError && <div className="alert alert-warning py-1 px-2 small mb-2">{searchError}</div>}

            {/* Map Container */}
            {mapLoadError ? (
              <div className="alert alert-danger py-2 small mb-3">{mapLoadError}</div>
            ) : (
              <div className="position-relative rounded border border-secondary overflow-hidden mb-3" style={{ height: '340px' }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                {!mapReady && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75">
                    <div className="spinner-border text-info" role="status"></div>
                  </div>
                )}
                <div className="position-absolute bottom-0 start-0 m-2 badge bg-dark text-white border border-secondary p-2">
                  <i className="bi bi-info-circle text-info me-1"></i> Click the map or drag the pin to adjust the location
                </div>
              </div>
            )}

            {/* Auto-filled Location Details */}
            <div className="p-3 bg-secondary bg-opacity-25 rounded border border-secondary mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h6 className="fw-bold text-success mb-0">
                  <i className="bi bi-geo-alt-fill me-1"></i>Auto-Detected Address Components
                </h6>
                {loadingGeocode && <span className="spinner-border spinner-border-sm text-info" role="status"></span>}
              </div>

              <div className="row g-2 small">
                <div className="col-md-6">
                  <strong>Street Address:</strong> {addressComponents.address || 'N/A'}
                </div>
                <div className="col-md-2 col-6">
                  <strong>City:</strong> {addressComponents.city || 'N/A'}
                </div>
                <div className="col-md-2 col-6">
                  <strong>State:</strong> {addressComponents.state || 'N/A'}
                </div>
                <div className="col-md-2 col-6">
                  <strong>Pincode:</strong> {addressComponents.pincode || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-success fw-bold px-4" onClick={handleConfirm}>
              <i className="bi bi-check-circle me-1"></i>Confirm & Auto-fill Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
