package com.wheelconnect.booking.controller;

import com.wheelconnect.booking.dto.AddVehicleDto;
import com.wheelconnect.booking.dto.VehicleLookupResponseDto;
import com.wheelconnect.booking.entity.Vehicle;
import com.wheelconnect.booking.exception.ResourceNotFoundException;
import com.wheelconnect.booking.service.VehicleLookupService;
import com.wheelconnect.booking.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;
    private final VehicleLookupService vehicleLookupService;

    public VehicleController(VehicleService vehicleService, VehicleLookupService vehicleLookupService) {
        this.vehicleService = vehicleService;
        this.vehicleLookupService = vehicleLookupService;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    @GetMapping("/my")
    public ResponseEntity<List<Vehicle>> getMyVehicles() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(vehicleService.getVehiclesByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getVehicleById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Optional<Vehicle> opt = vehicleService.getVehicleById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Vehicle vehicle = opt.get();
        if (!userId.equals(vehicle.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied. You can only view your own vehicles."));
        }
        return ResponseEntity.ok(vehicle);
    }

    @PostMapping
    public ResponseEntity<?> addVehicle(@Valid @RequestBody AddVehicleDto dto) {
        Long userId = getCurrentUserId();
        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleNumber(dto.getVehicleNumber());
        vehicle.setVehicleModel(dto.getVehicleModel());
        vehicle.setVehicleType(dto.getVehicleType());
        vehicle.setUserId(userId);

        Vehicle saved = vehicleService.addVehicle(vehicle);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Vehicle added successfully!", "id", saved.getId(), "vehicle", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicle(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        boolean deleted = vehicleService.deleteVehicle(id, userId);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Vehicle deleted successfully."));
    }

    @GetMapping("/lookup")
    public ResponseEntity<VehicleLookupResponseDto> lookupVehicle(@RequestParam String vehicleNumber) {
        VehicleLookupResponseDto result = vehicleLookupService.lookupVehicle(vehicleNumber);
        return ResponseEntity.ok(result);
    }

    // Inter-service internal endpoint
    @GetMapping("/internal/{id}")
    public ResponseEntity<Vehicle> getInternalVehicleById(@PathVariable Long id) {
        return vehicleService.getVehicleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
