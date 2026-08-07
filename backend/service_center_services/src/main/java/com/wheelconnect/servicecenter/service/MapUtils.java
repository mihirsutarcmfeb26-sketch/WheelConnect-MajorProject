package com.wheelconnect.servicecenter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Geocoding and distance utilities for the Maps / Location module.
 *
 * <p>Provider strategy (no fake/mock data is ever returned):</p>
 * <ol>
 *   <li>If the {@code GOOGLE_MAPS_API_KEY} environment variable is configured, Google's
 *       Geocoding API is used first (paid, higher accuracy).</li>
 *   <li>Otherwise - or if the Google call fails/returns no result - a real lookup is made
 *       against OpenStreetMap's free Nominatim service. No API key or billing is required
 *       for this path, so the location module always works out of the box.</li>
 * </ol>
 *
 * <p>If neither provider can resolve a location, callers receive {@code null} (forward
 * geocoding) so they can leave coordinates unset rather than persisting a fabricated
 * location. Reverse geocoding returns the raw coordinates as a last resort instead of a
 * hardcoded place name.</p>
 */
public final class MapUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // Nominatim's usage policy requires a descriptive User-Agent identifying the application
    // making the request (see https://operations.osmfoundation.org/policies/nominatim/).
    private static final String NOMINATIM_USER_AGENT =
            "WheelConnect-ServiceCenterService/1.0 (+https://wheelconnect.app; contact: support@wheelconnect.app)";
    private static final String NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
    private static final String NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
    private static final String GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

    private MapUtils() {
        // static utility class
    }

    /**
     * Calculates the great-circle distance between two lat/lng points using the Haversine
     * formula, in kilometers, rounded to 1 decimal place.
     */
    public static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = EARTH_RADIUS_KM * c;
        return Math.round(distance * 10.0) / 10.0;
    }

    /**
     * Forward geocodes a free-text address/search query into coordinates plus structured
     * address components (address, city, state, pincode). Returns {@code null} if no
     * provider could resolve the query - callers should leave coordinates unset in that
     * case rather than substituting a made-up location.
     */
    public static Map<String, String> forwardGeocode(String query) {
        if (query == null || query.trim().isEmpty()) {
            return null;
        }

        Map<String, String> googleResult = forwardGeocodeGoogle(query.trim());
        if (googleResult != null) {
            return googleResult;
        }

        return forwardGeocodeNominatim(query.trim());
    }

    /**
     * Convenience helper for callers that only need coordinates (e.g. auto-geocoding a
     * ServiceCenter's address). Returns {@code null} when no real coordinates could be
     * resolved for the given address.
     */
    public static double[] geocodeAddress(String address) {
        Map<String, String> result = forwardGeocode(address);
        if (result == null) {
            return null;
        }
        String lat = result.get("latitude");
        String lng = result.get("longitude");
        if (lat == null || lng == null) {
            return null;
        }
        try {
            return new double[]{Double.parseDouble(lat), Double.parseDouble(lng)};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Reverse geocodes lat/lng coordinates into an address, city, state and pincode using
     * a real geocoding provider. If no provider can resolve an address for the given
     * coordinates (e.g. no network access, or a remote/ocean location), the raw
     * coordinates are returned as the address instead of a fabricated place name.
     */
    public static Map<String, String> reverseGeocode(double lat, double lng) {
        Map<String, String> googleResult = reverseGeocodeGoogle(lat, lng);
        if (googleResult != null) {
            return googleResult;
        }

        Map<String, String> nominatimResult = reverseGeocodeNominatim(lat, lng);
        if (nominatimResult != null) {
            return nominatimResult;
        }

        Map<String, String> unresolved = new HashMap<>();
        unresolved.put("address", String.format("Location at %.5f, %.5f", lat, lng));
        unresolved.put("city", "");
        unresolved.put("state", "");
        unresolved.put("pincode", "");
        return unresolved;
    }

    // -------------------------------------------------------------------------------
    // Google Geocoding API (used only when GOOGLE_MAPS_API_KEY is configured)
    // -------------------------------------------------------------------------------

    private static Map<String, String> forwardGeocodeGoogle(String query) {
        String apiKey = System.getenv("GOOGLE_MAPS_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        try {
            String url = GOOGLE_GEOCODE_URL + "?address=" + urlEncode(query) + "&key=" + apiKey;
            JsonNode root = fetchJson(url, false);
            if (root == null) return null;

            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) return null;

            JsonNode first = results.get(0);
            JsonNode location = first.path("geometry").path("location");
            if (location.isMissingNode()) return null;

            Map<String, String> result = extractGoogleAddressComponents(first);
            result.put("latitude", location.path("lat").asText());
            result.put("longitude", location.path("lng").asText());
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, String> reverseGeocodeGoogle(double lat, double lng) {
        String apiKey = System.getenv("GOOGLE_MAPS_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        try {
            String url = GOOGLE_GEOCODE_URL + "?latlng=" + lat + "," + lng + "&key=" + apiKey;
            JsonNode root = fetchJson(url, false);
            if (root == null) return null;

            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) return null;

            return extractGoogleAddressComponents(results.get(0));
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, String> extractGoogleAddressComponents(JsonNode result) {
        Map<String, String> map = new HashMap<>();
        map.put("address", result.path("formatted_address").asText(""));

        String city = "";
        String state = "";
        String pincode = "";
        for (JsonNode comp : result.path("address_components")) {
            List<String> types = new ArrayList<>();
            comp.path("types").forEach(t -> types.add(t.asText()));

            if (city.isEmpty() && types.contains("locality")) {
                city = comp.path("long_name").asText("");
            }
            if (city.isEmpty() && types.contains("administrative_area_level_2")) {
                city = comp.path("long_name").asText("");
            }
            if (types.contains("administrative_area_level_1")) {
                state = comp.path("long_name").asText("");
            }
            if (types.contains("postal_code")) {
                pincode = comp.path("long_name").asText("");
            }
        }
        map.put("city", city);
        map.put("state", state);
        map.put("pincode", pincode);
        return map;
    }

    // -------------------------------------------------------------------------------
    // OpenStreetMap Nominatim (free, no API key required)
    // -------------------------------------------------------------------------------

    private static Map<String, String> forwardGeocodeNominatim(String query) {
        try {
            String url = NOMINATIM_SEARCH_URL + "?q=" + urlEncode(query)
                    + "&format=jsonv2&addressdetails=1&limit=1";
            JsonNode root = fetchJson(url, true);
            if (root == null || !root.isArray() || root.isEmpty()) return null;

            JsonNode first = root.get(0);
            Map<String, String> result = extractNominatimAddress(first);
            result.put("latitude", first.path("lat").asText());
            result.put("longitude", first.path("lon").asText());
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, String> reverseGeocodeNominatim(double lat, double lng) {
        try {
            String url = NOMINATIM_REVERSE_URL + "?lat=" + lat + "&lon=" + lng
                    + "&format=jsonv2&addressdetails=1&zoom=18";
            JsonNode root = fetchJson(url, true);
            if (root == null || root.has("error")) return null;

            return extractNominatimAddress(root);
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, String> extractNominatimAddress(JsonNode node) {
        Map<String, String> map = new HashMap<>();
        map.put("address", node.path("display_name").asText(""));

        JsonNode addr = node.path("address");
        String city = firstNonBlank(
                addr.path("city").asText(""),
                addr.path("town").asText(""),
                addr.path("village").asText(""),
                addr.path("suburb").asText(""),
                addr.path("county").asText("")
        );
        map.put("city", city);
        map.put("state", addr.path("state").asText(""));
        map.put("pincode", addr.path("postcode").asText(""));
        return map;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    // -------------------------------------------------------------------------------
    // Shared HTTP helper
    // -------------------------------------------------------------------------------

    private static JsonNode fetchJson(String url, boolean nominatim) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(5))
                .GET();

        if (nominatim) {
            // Required by Nominatim's usage policy for automated/server-side requests.
            builder.header("User-Agent", NOMINATIM_USER_AGENT);
        }

        HttpResponse<String> response = HTTP_CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
            return null;
        }
        return MAPPER.readTree(response.body());
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
