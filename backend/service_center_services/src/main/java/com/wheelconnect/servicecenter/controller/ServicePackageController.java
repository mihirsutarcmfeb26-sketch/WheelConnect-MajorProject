package com.wheelconnect.servicecenter.controller;

import com.wheelconnect.servicecenter.dto.CreatePackageDto;
import com.wheelconnect.servicecenter.entity.ServicePackage;
import com.wheelconnect.servicecenter.exception.ResourceNotFoundException;
import com.wheelconnect.servicecenter.service.ServicePackageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/packages")
public class ServicePackageController {

    private final ServicePackageService packageService;

    public ServicePackageController(ServicePackageService packageService) {
        this.packageService = packageService;
    }

    @GetMapping
    public ResponseEntity<List<ServicePackage>> getAllPackages() {
        return ResponseEntity.ok(packageService.getAllPackages());
    }

    @GetMapping("/service-center/{serviceCenterId}")
    public ResponseEntity<List<ServicePackage>> getPackagesByServiceCenter(@PathVariable Long serviceCenterId) {
        List<ServicePackage> list = packageService.getPackagesByServiceCenterId(serviceCenterId).stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServicePackage> getPackageById(@PathVariable Long id) {
        return packageService.getPackageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/service-center/{serviceCenterId}")
    public ResponseEntity<?> createPackage(@PathVariable Long serviceCenterId, @Valid @RequestBody CreatePackageDto dto) {
        ServicePackage pkg = new ServicePackage();
        pkg.setName(dto.getName());
        pkg.setDescription(dto.getDescription() != null ? dto.getDescription() : "");
        pkg.setPrice(dto.getPrice());
        pkg.setDurationInMinutes(dto.getDurationInMinutes() != null ? dto.getDurationInMinutes() : 0);
        pkg.setServiceCenterId(serviceCenterId);
        pkg.setIsActive(true);

        ServicePackage created = packageService.createPackage(pkg);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editPackage(@PathVariable Long id, @Valid @RequestBody CreatePackageDto dto) {
        ServicePackage pkg = packageService.getPackageById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePackage", "id", id));

        pkg.setName(dto.getName());
        pkg.setDescription(dto.getDescription() != null ? dto.getDescription() : "");
        pkg.setPrice(dto.getPrice());
        pkg.setDurationInMinutes(dto.getDurationInMinutes() != null ? dto.getDurationInMinutes() : 0);

        ServicePackage updated = packageService.updatePackage(pkg);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePackage(@PathVariable Long id) {
        boolean deleted = packageService.deletePackage(id);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Package deleted successfully."));
    }
}
