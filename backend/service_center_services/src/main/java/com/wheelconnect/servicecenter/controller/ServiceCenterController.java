package com.wheelconnect.servicecenter.controller;

import com.wheelconnect.servicecenter.dto.CreateServiceCenterDto;
import com.wheelconnect.servicecenter.dto.EditServiceCenterDto;
import com.wheelconnect.servicecenter.dto.ServiceCenterLocationDto;
import com.wheelconnect.servicecenter.entity.ServiceCenter;
import com.wheelconnect.servicecenter.exception.ResourceNotFoundException;
import com.wheelconnect.servicecenter.service.LocationService;
import com.wheelconnect.servicecenter.service.ServiceCenterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/service-centers")
public class ServiceCenterController {

    private final ServiceCenterService serviceCenterService;
    private final LocationService locationService;

    public ServiceCenterController(ServiceCenterService serviceCenterService, LocationService locationService) {
        this.serviceCenterService = serviceCenterService;
        this.locationService = locationService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceCenter>> getAllServiceCenters() {
        return ResponseEntity.ok(serviceCenterService.getAllServiceCenters());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ServiceCenter>> getActiveServiceCenters() {
        return ResponseEntity.ok(serviceCenterService.getActiveServiceCenters());
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<ServiceCenterLocationDto>> getNearbyServiceCenters(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        List<ServiceCenter> activeCenters = serviceCenterService.getActiveServiceCenters();
        List<ServiceCenterLocationDto> nearbyList = locationService.findNearbyCenters(activeCenters, lat, lng);
        return ResponseEntity.ok(nearbyList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceCenter> getServiceCenterById(@PathVariable Long id) {
        return serviceCenterService.getServiceCenterById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ServiceCenter>> getServiceCentersByUserId(@PathVariable Long userId) {
        List<ServiceCenter> centers = serviceCenterService.getServiceCentersByUserId(userId);
        return ResponseEntity.ok(centers);
    }

    @PostMapping
    public ResponseEntity<?> createServiceCenter(@Valid @RequestBody CreateServiceCenterDto dto) {
        ServiceCenter sc = new ServiceCenter();
        sc.setName(dto.getName());
        sc.setAddress(dto.getAddress());
        sc.setPhone(dto.getPhone());
        sc.setEmail(dto.getEmail());
        // Leave coordinates unset if not provided - ServiceCenterServiceImpl will resolve
        // real coordinates from the address via geocoding rather than defaulting to a
        // fixed fallback location.
        sc.setLatitude(dto.getLatitude());
        sc.setLongitude(dto.getLongitude());
        sc.setIsActive(true);
        sc.setUserId(dto.getUserId() != null ? dto.getUserId() : 0L);
        if (dto.getServicesOffered() != null) {
            sc.setServicesOffered(dto.getServicesOffered());
        }

        ServiceCenter created = serviceCenterService.createServiceCenter(sc);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editServiceCenter(@PathVariable Long id, @Valid @RequestBody EditServiceCenterDto dto) {
        ServiceCenter sc = serviceCenterService.getServiceCenterById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCenter", "id", id));

        sc.setName(dto.getName());
        if (dto.getAddress() != null) sc.setAddress(dto.getAddress());
        if (dto.getPhone() != null) sc.setPhone(dto.getPhone());
        if (dto.getEmail() != null) sc.setEmail(dto.getEmail());
        if (dto.getLatitude() != null) sc.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) sc.setLongitude(dto.getLongitude());
        if (dto.getIsActive() != null) sc.setIsActive(dto.getIsActive());
        // Null means "not sent by the client" - leave existing services untouched.
        // An empty list is a deliberate "clear all services" and is applied as-is.
        if (dto.getServicesOffered() != null) sc.setServicesOffered(dto.getServicesOffered());

        ServiceCenter updated = serviceCenterService.updateServiceCenter(sc);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<?> toggleServiceCenter(@PathVariable Long id) {
        boolean toggled = serviceCenterService.toggleActive(id);
        if (!toggled) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Service Center active state toggled successfully."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServiceCenter(@PathVariable Long id) {
        boolean deleted = serviceCenterService.deleteServiceCenter(id);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Service Center deleted successfully."));
    }
}
