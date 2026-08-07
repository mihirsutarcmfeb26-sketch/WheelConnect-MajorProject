import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadLeaflet, createPinIcon, createUserLocationIcon } from '../utils/leafletLoader';

// Geographic center of India - used only as a neutral starting camera position before
// any real location data (user GPS or service centers) has loaded. It is never presented
// to the user as an actual address or "current location".
const DEFAULT_VIEW = { lat: 20.5937, lng: 78.9629, zoom: 5 };

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const MapComponent = ({
  centers = [],
  userLocation = null,
  selectedCenter = null,
  onSelectCenter = () => {},
  height = '400px',
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Load Leaflet (free, no API key) and initialize the map once.
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current) return;
        leafletRef.current = L;

        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current, {
            center: [DEFAULT_VIEW.lat, DEFAULT_VIEW.lng],
            zoom: DEFAULT_VIEW.zoom,
            scrollWheelZoom: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          mapInstanceRef.current = map;
        }

        setMapReady(true);
      })
      .catch((err) => {
        console.error('Failed to load map library:', err);
        if (!cancelled) setLoadError(err.message || 'Failed to load the map.');
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

  const getDirectionsUrl = useCallback((center, location) => {
    const dest =
      center.latitude != null && center.longitude != null
        ? `${center.latitude},${center.longitude}`
        : encodeURIComponent(center.address || center.name || '');
    let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    if (location) {
      url += `&origin=${location.lat},${location.lng}`;
    }
    return url;
  }, []);

  // Render/update markers whenever the underlying data changes.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Clear previous service-center markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Clear previous user-location marker
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    const bounds = [];

    // User location marker
    if (userLocation) {
      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(L),
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(map);
      marker.bindPopup('<strong>Your Location</strong>', { className: 'wc-map-popup' });
      userMarkerRef.current = marker;
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    // Service center markers - each one is genuinely clickable and selects the center.
    centers.forEach((center) => {
      if (center.latitude == null || center.longitude == null) return;

      const isSelected = selectedCenter?.id === center.id;
      const marker = L.marker([center.latitude, center.longitude], {
        icon: createPinIcon(L, { color: isSelected ? '#198754' : '#0d6efd', pulse: isSelected }),
      }).addTo(map);

      const services = Array.isArray(center.availableServices)
        ? center.availableServices.slice(0, 3).join(', ')
        : '';
      const dirUrl = getDirectionsUrl(center, userLocation);

      const popupHtml = `
        <div style="min-width:220px;max-width:260px;">
          <h6 style="margin-bottom:4px;font-weight:bold;color:#60a5fa;">${escapeHtml(center.name)}</h6>
          ${center.address ? `<p style="margin-bottom:4px;font-size:12px;">${escapeHtml(center.address)}</p>` : ''}
          ${center.phone ? `<p style="margin-bottom:4px;font-size:12px;"><strong>Phone:</strong> ${escapeHtml(center.phone)}</p>` : ''}
          ${services ? `<p style="margin-bottom:4px;font-size:12px;"><strong>Services:</strong> ${escapeHtml(services)}</p>` : ''}
          ${center.distanceKm != null ? `<p style="margin-bottom:4px;font-size:12px;color:#34d399;"><strong>Distance:</strong> ${center.distanceKm} km</p>` : ''}
          ${center.workingHours ? `<p style="margin-bottom:6px;font-size:11px;color:#94a3b8;"><strong>Hours:</strong> ${escapeHtml(center.workingHours)}</p>` : ''}
          <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0d6efd;color:#fff;padding:4px 10px;font-size:12px;border-radius:4px;text-decoration:none;font-weight:500;">
            Get Directions
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'wc-map-popup' });

      // Clicking a marker selects that service center for booking, per spec.
      marker.on('click', () => {
        onSelectCenter(center);
        marker.openPopup();
      });

      markersRef.current.push(marker);
      bounds.push([center.latitude, center.longitude]);
    });

    // Fit the viewport to show whatever is actually on the map.
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }
  }, [mapReady, centers, userLocation, selectedCenter, onSelectCenter, getDirectionsUrl]);

  // Keep the map correctly sized if the container's dimensions change (e.g. switching
  // between "Map View" and "Split View").
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const timer = setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [mapReady, height]);

  if (loadError) {
    return (
      <div
        className="d-flex align-items-center justify-content-center rounded-3 border border-secondary bg-dark text-muted"
        style={{ height, minHeight: '320px' }}
      >
        <div className="text-center p-3">
          <i className="bi bi-map display-6 d-block mb-2"></i>
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative rounded-3 overflow-hidden border border-secondary shadow-sm" style={{ height }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!mapReady && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
