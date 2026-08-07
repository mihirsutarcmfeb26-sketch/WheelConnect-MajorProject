// Dynamically loads Leaflet (a free, open-source mapping library) together with
// OpenStreetMap tiles. This gives the app a fully working interactive map - with real
// clickable markers, popups, and a draggable location picker - without requiring a paid
// Google Maps API key. Both the customer "Find Service Centres" map and the Service
// Centre "Select Location on Map" picker share this exact same loader, so they use one
// consistent location system end to end.

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let leafletLoadPromise = null;

/**
 * Loads Leaflet's CSS + JS (once, shared across the whole app) and resolves with the
 * global `L` namespace once it's ready to use.
 */
export function loadLeaflet() {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise((resolve, reject) => {
    // Stylesheet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js-sdk';
    let script = document.getElementById(scriptId);

    const handleLoad = () => {
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error('Leaflet failed to initialize after loading.'));
      }
    };

    const handleError = () => {
      leafletLoadPromise = null; // allow a future retry
      reject(new Error('Failed to load the map library. Please check your internet connection.'));
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = handleLoad;
      script.onerror = handleError;
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      if (window.L) handleLoad();
    }
  });

  return leafletLoadPromise;
}

/**
 * Builds a colored SVG pin divIcon. Using an inline SVG (instead of Leaflet's default
 * image-based marker icons) avoids the well-known "broken marker icon" problem that
 * happens when Leaflet's default marker images aren't bundled/served correctly - there
 * is no external image asset to go missing.
 */
export function createPinIcon(L, { color = '#0d6efd', size = 34, pulse = false } = {}) {
  const html = `
    <div class="wc-map-pin${pulse ? ' wc-map-pin-active' : ''}" style="width:${size}px;height:${size}px;">
      <svg viewBox="0 0 24 36" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" fill="#ffffff"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'wc-map-pin-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

/**
 * Builds a small blue pulsing dot icon used to mark the user's own current location
 * (distinct from the pin icons used for service centers).
 */
export function createUserLocationIcon(L, size = 22) {
  const html = `
    <div class="wc-user-location-dot" style="width:${size}px;height:${size}px;">
      <div class="wc-user-location-dot-core"></div>
      <div class="wc-user-location-dot-pulse"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'wc-user-location-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
