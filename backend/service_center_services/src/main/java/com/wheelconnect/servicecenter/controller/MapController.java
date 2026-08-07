package com.wheelconnect.servicecenter.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wheelconnect.servicecenter.dto.MapDTO;
import com.wheelconnect.servicecenter.service.MapService;
import com.wheelconnect.servicecenter.service.MapUtils;

@RestController
@RequestMapping("/api/service-centers")
public class MapController {

    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("/map")
    public ResponseEntity<List<MapDTO>> getActiveMapCenters(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        List<MapDTO> centers = mapService.getMapServiceCenters(lat, lng);
        return ResponseEntity.ok(centers);
    }

    @GetMapping("/map/nearby")
    public ResponseEntity<List<MapDTO>> getNearbyCenters(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        List<MapDTO> nearbyCenters = mapService.getNearbyServiceCenters(lat, lng);
        return ResponseEntity.ok(nearbyCenters);
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<Map<String, String>> reverseGeocode(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        Map<String, String> components = MapUtils.reverseGeocode(lat, lng);
        return ResponseEntity.ok(components);
    }

    /**
     * Forward geocodes a free-text search query (city, area, landmark, address) into
     * coordinates + structured address components. Used by the "Search Location" bar in
     * the location picker on both the customer booking flow and the service center
     * application flow, so both share the exact same location system.
     */
    @GetMapping("/geocode")
    public ResponseEntity<?> forwardGeocode(@RequestParam String query) {
        Map<String, String> result = MapUtils.forwardGeocode(query);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No location found for \"" + query + "\". Try a more specific search."));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/location")
    public ResponseEntity<MapDTO> getCenterLocation(
            @PathVariable Long id,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        MapDTO centerLocation = mapService.getServiceCenterLocation(id, lat, lng);
        return ResponseEntity.ok(centerLocation);
    }
}
