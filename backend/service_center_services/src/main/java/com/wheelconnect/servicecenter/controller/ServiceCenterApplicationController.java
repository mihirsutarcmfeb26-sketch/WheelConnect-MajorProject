package com.wheelconnect.servicecenter.controller;

import com.wheelconnect.servicecenter.entity.ServiceCenterApplication;
import com.wheelconnect.servicecenter.service.ServiceCenterApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service-centers/applications")
public class ServiceCenterApplicationController {

    private final ServiceCenterApplicationService applicationService;

    public ServiceCenterApplicationController(ServiceCenterApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ResponseEntity<?> submitApplication(@Valid @RequestBody ServiceCenterApplication application) {
        ServiceCenterApplication created = applicationService.submitApplication(application);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyApplication(@RequestParam Long userId) {
        return applicationService.getApplicationByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<ServiceCenterApplication>> getAllApplications() {
        return ResponseEntity.ok(applicationService.getAllApplications());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceCenterApplication> getApplicationById(@PathVariable Long id) {
        return applicationService.getApplicationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveApplication(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String remarks = (body != null && body.containsKey("remarks")) ? body.get("remarks") : null;
        ServiceCenterApplication approved = applicationService.approveApplication(id, remarks);
        return ResponseEntity.ok(approved);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectApplication(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String remarks = (body != null && body.containsKey("remarks")) ? body.get("remarks") : null;
        ServiceCenterApplication rejected = applicationService.rejectApplication(id, remarks);
        return ResponseEntity.ok(rejected);
    }
}
