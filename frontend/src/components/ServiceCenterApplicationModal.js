import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LocationPickerModal from './LocationPickerModal';
import ServiceSelector from './ServiceSelector';

const ServiceCenterApplicationModal = ({ onClose, onSuccess }) => {
  const { user } = useAuth();

  const [serviceCenterName, setServiceCenterName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [workingHours, setWorkingHours] = useState('9:00 AM - 7:00 PM (Mon-Sat)');
  const [servicesOffered, setServicesOffered] = useState([]);

  // Location & Geocoding state
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [lowAccuracyWarning, setLowAccuracyWarning] = useState('');

  // Optional fields
  const [gstNumber, setGstNumber] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [registrationCertificate, setRegistrationCertificate] = useState('');
  const [garagePhotos, setGaragePhotos] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUseCurrentLocation = () => {
    setLocationMsg('');
    setLowAccuracyWarning('');
    if (!navigator.geolocation) {
      setLocationMsg('Geolocation is not supported by your browser. Please select on map or enter manually.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Never swap these - browser Geolocation always returns latitude first.
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy; // meters
        setLatitude(lat);
        setLongitude(lng);

        // Poor GPS accuracy (large radius of uncertainty) means the pin may not be on
        // the correct spot - tell the user to double check / drag the marker instead of
        // silently trusting it.
        if (accuracy != null && accuracy > 100) {
          setLowAccuracyWarning(
            `Your GPS accuracy is low (±${Math.round(accuracy)}m). Please use "Select Location on Map" to confirm or adjust the exact position before submitting.`
          );
        }

        try {
          const resp = await api.get(`/api/service-centers/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (resp.data.address) setAddress(resp.data.address);
          if (resp.data.city) setCity(resp.data.city);
          if (resp.data.state) setState(resp.data.state);
          if (resp.data.pincode) setPincode(resp.data.pincode);
          setLocationMsg('📍 Location & address components auto-filled from current GPS!');
        } catch {
          setLocationMsg(`📍 Coordinates captured (${lat.toFixed(4)}, ${lng.toFixed(4)}). Please confirm address details below.`);
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation permission denied or unavailable:', err);
        setLocationMsg('⚠️ GPS permission denied. You can select location on map or enter address manually below.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMapConfirm = (data) => {
    if (data.latitude) setLatitude(data.latitude);
    if (data.longitude) setLongitude(data.longitude);
    if (data.address) setAddress(data.address);
    if (data.city) setCity(data.city);
    if (data.state) setState(data.state);
    if (data.pincode) setPincode(data.pincode);
    setLocationMsg('🗺 Location & address components auto-filled from map selection!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!serviceCenterName.trim()) return setError('Service Centre Name is required.');
    if (!address.trim()) return setError('Address is required.');
    if (!city.trim()) return setError('City is required.');
    if (!state.trim()) return setError('State is required.');
    if (!pincode.trim()) return setError('Pincode is required.');
    if (!workingHours.trim()) return setError('Working Hours are required.');
    if (servicesOffered.length === 0) return setError('Please select at least one service (predefined or custom).');

    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone || '',
        serviceCenterName: serviceCenterName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        workingHours: workingHours.trim(),
        servicesOffered: servicesOffered,
        gstNumber: gstNumber.trim(),
        businessLicense: businessLicense.trim(),
        registrationCertificate: registrationCertificate.trim(),
        garagePhotos: garagePhotos.trim(),
        profileImage: profileImage.trim(),
        latitude: latitude,
        longitude: longitude,
        status: 'PENDING',
      };

      const resp = await api.post('/api/service-centers/applications', payload);
      if (onSuccess) onSuccess(resp.data);
      onClose();
    } catch (err) {
      console.error('Application submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit application. Please check your entries.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block tab-modal-backdrop" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          <div className="modal-header border-secondary">
            <h5 className="modal-title fw-bold text-primary">
              <i className="bi bi-building-add me-2"></i>Service Centre Application
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

              <div className="alert alert-info py-2 small mb-4">
                <i className="bi bi-info-circle me-2"></i>
                Applicant credentials are auto-filled from your customer profile. Please enter your service centre details.
              </div>

              <h6 className="fw-bold text-light mb-3 border-bottom border-secondary pb-2">Applicant Details (Auto-filled)</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label text-muted small mb-1">Applicant Name</label>
                  <input type="text" className="form-control bg-secondary text-white border-0" value={user?.name || ''} readOnly />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small mb-1">Applicant Email</label>
                  <input type="text" className="form-control bg-secondary text-white border-0" value={user?.email || ''} readOnly />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small mb-1">Applicant Phone</label>
                  <input type="text" className="form-control bg-secondary text-white border-0" value={user?.phone || 'N/A'} readOnly />
                </div>
              </div>

              <h6 className="fw-bold text-light mb-3 border-bottom border-secondary pb-2">Service Centre Info (Required)</h6>
              <div className="mb-3">
                <label className="form-label text-light small fw-semibold">Service Centre Name *</label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="e.g. Apex Auto Care & Repairs"
                  value={serviceCenterName}
                  onChange={(e) => setServiceCenterName(e.target.value)}
                  required
                />
              </div>

              {/* Service Centre Location options */}
              <div className="p-3 bg-dark bg-opacity-75 border border-secondary rounded mb-3">
                <label className="form-label text-info fw-bold small mb-2 d-block">
                  <i className="bi bi-geo-alt-fill me-1"></i>Service Centre Location
                </label>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <button
                    type="button"
                    className="btn btn-outline-info btn-sm fw-semibold"
                    onClick={handleUseCurrentLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <span><span className="spinner-border spinner-border-sm me-1" role="status"></span>Detecting GPS...</span>
                    ) : (
                      <span>📍 Use Current Location</span>
                    )}
                  </button>
                  <span className="text-muted small">OR</span>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm fw-semibold"
                    onClick={() => setShowMapModal(true)}
                  >
                    🗺 Select Location on Map
                  </button>
                </div>
                {locationMsg && <div className="text-info extra-small fw-normal">{locationMsg}</div>}
                {lowAccuracyWarning && (
                  <div className="alert alert-warning py-1 px-2 extra-small mt-2 mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    {lowAccuracyWarning}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label text-light small fw-semibold">Street Address *</label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="e.g. Shop #12, SV Road, Bandra West"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label text-light small fw-semibold">City *</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-light small fw-semibold">State *</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-light small fw-semibold">Pincode *</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="400050"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-light small fw-semibold">Working Hours *</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. 9:00 AM - 7:00 PM (Mon-Sat)"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    required
                  />
                </div>
              </div>

              <h6 className="fw-bold text-light mb-3 border-bottom border-secondary pb-2 pt-2">Services Offered *</h6>
              <div className="p-3 bg-dark bg-opacity-75 border border-secondary rounded mb-3">
                <ServiceSelector selectedServices={servicesOffered} onChange={setServicesOffered} />
              </div>

              <h6 className="fw-bold text-light mb-3 border-bottom border-secondary pb-2 pt-2">Business & License Documents (Optional)</h6>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-light small">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="27AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-light small">Business License No. / URL (Optional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="LIC-12345678"
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-light small">Registration Certificate No. / URL (Optional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="REG-87654321"
                    value={registrationCertificate}
                    onChange={(e) => setRegistrationCertificate(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-light small">Garage Photo URL (Optional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="https://..."
                    value={garagePhotos}
                    onChange={(e) => setGaragePhotos(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-light small">Profile Image URL (Optional)</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="https://..."
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer border-secondary">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="gradient-btn px-4" disabled={loading}>
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Submitting Application...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showMapModal && (
        <LocationPickerModal
          onClose={() => setShowMapModal(false)}
          onConfirm={handleMapConfirm}
          initialLat={latitude || 19.0760}
          initialLng={longitude || 72.8777}
        />
      )}
    </div>
  );
};

export default ServiceCenterApplicationModal;
