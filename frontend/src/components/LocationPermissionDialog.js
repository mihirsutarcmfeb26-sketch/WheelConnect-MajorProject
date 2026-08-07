import React from 'react';

const LocationPermissionDialog = ({ status, userLocation, onRetry, onDismiss }) => {
  if (status === 'granted' && userLocation) {
    return (
      <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3 rounded-3 shadow-sm border-0">
        <div className="d-flex align-items-center">
          <i className="bi bi-geo-alt-fill text-success fs-5 me-2"></i>
          <div>
            <strong className="d-block text-dark">Location Active</strong>
            <span className="small text-muted">
              Centered at Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
            </span>
          </div>
        </div>
        <span className="badge bg-success px-3 py-2 rounded-pill">GPS Connected</span>
      </div>
    );
  }

  if (status === 'denied' || status === 'unavailable') {
    return (
      <div className="alert alert-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 mb-3 rounded-3 shadow-sm border-0">
        <div className="d-flex align-items-start mb-2 mb-md-0">
          <i className="bi bi-exclamation-triangle-fill text-warning fs-4 me-3 mt-1"></i>
          <div>
            <strong className="d-block text-dark">Location Permission Denied or Unavailable</strong>
            <span className="small text-secondary">
              Showing default address list for service centers. You can browse all active service centers below or retry enabling location.
            </span>
          </div>
        </div>
        <div className="d-flex gap-2 align-self-end align-self-md-center ms-md-3">
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1"></i> Retry Geolocation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alert alert-info d-flex align-items-center justify-content-between py-2 px-3 mb-3 rounded-3 shadow-sm border-0">
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm text-info me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div>
          <strong className="d-block text-dark">Detecting Location...</strong>
          <span className="small text-muted">Requesting browser location permission</span>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionDialog;
