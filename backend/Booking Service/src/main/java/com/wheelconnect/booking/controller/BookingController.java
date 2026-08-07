package com.wheelconnect.booking.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wheelconnect.booking.dto.BookServiceDto;
import com.wheelconnect.booking.dto.ServiceRequestResponseDto;
import com.wheelconnect.booking.entity.ServiceRequest;
import com.wheelconnect.booking.entity.Vehicle;
import com.wheelconnect.booking.exception.ResourceNotFoundException;
import com.wheelconnect.booking.service.ServiceRequestService;
import com.wheelconnect.booking.service.VehicleService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final ServiceRequestService bookingService;
    private final VehicleService vehicleService;

    @Value("${services.auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    public BookingController(ServiceRequestService bookingService, VehicleService vehicleService) {
        this.bookingService = bookingService;
        this.vehicleService = vehicleService;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    private String getCurrentRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return auth.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .orElse(null);
    }

    /**
     * Business-level booking status - who's allowed to accept/reject a booking and close
     * it out once the vehicle is handed back. Set only by the Service Center.
     */
    private static final java.util.Set<String> SERVICE_CENTER_STATUSES =
            java.util.Set.of("ACCEPTED", "CANCELLED", "COMPLETED");

    /**
     * Repair-progress status - the mechanic's own granular workflow. Set only by the
     * Mechanic. COMPLETED is shared with the Service Center deliberately: it's the one
     * state both sides can legitimately arrive at (repair finished / vehicle delivered),
     * and since it's always the last stage on either side it never overwrites progress
     * that came before it - it only ever gets written after everything else is done.
     */
    private static final java.util.Set<String> MECHANIC_STATUSES = java.util.Set.of(
            "MECHANIC_ASSIGNED", "IN_PROGRESS", "INSPECTION_COMPLETED", "REPAIR_STARTED",
            "QUALITY_CHECK", "VEHICLE_WASHED", "READY_FOR_DELIVERY", "COMPLETED"
    );

    private ServiceRequestResponseDto toResponseDto(ServiceRequest request) {
        if (request == null) return null;
        ServiceRequestResponseDto dto = new ServiceRequestResponseDto();
        dto.setId(request.getId());
        dto.setVehicleId(request.getVehicleId());

        Optional<Vehicle> vOpt = vehicleService.getVehicleById(request.getVehicleId());
        if (vOpt.isPresent()) {
            Vehicle v = vOpt.get();
            dto.setVehicleNumber(v.getVehicleNumber());
            dto.setVehicleModel(v.getVehicleModel());
            dto.setVehicleType(v.getVehicleType());
            dto.setCustomerId(v.getUserId());
            dto.setCustomerName("Customer #" + v.getUserId());
            try {
                java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
                java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create(authServiceUrl + "/api/users/internal/" + v.getUserId()))
                        .GET()
                        .build();
                java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200 && resp.body() != null) {
                    String body = resp.body();
                    int nameIdx = body.indexOf("\"name\":\"");
                    if (nameIdx != -1) {
                        int start = nameIdx + 8;
                        int end = body.indexOf("\"", start);
                        dto.setCustomerName(body.substring(start, end));
                    }
                    int emailIdx = body.indexOf("\"email\":\"");
                    if (emailIdx != -1) {
                        int start = emailIdx + 9;
                        int end = body.indexOf("\"", start);
                        dto.setCustomerEmail(body.substring(start, end));
                    }
                }
            } catch (Exception e) {
                // Fallback customer name already set
            }
        }

        dto.setServiceType(request.getServiceType());
        dto.setSelectedServices(request.getSelectedServices());
        dto.setBookingDate(request.getBookingDate());
        dto.setStatus(request.getStatus());
        dto.setDescription(request.getDescription());
        dto.setNotes(request.getNotes());
        dto.setServiceCenterId(request.getServiceCenterId());
        dto.setMechanicId(request.getMechanicId());
        dto.setPackageId(request.getPackageId());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());
        return dto;
    }

    @GetMapping("/my")
    public ResponseEntity<List<ServiceRequestResponseDto>> getMyBookings() {
        Long userId = getCurrentUserId();
        List<ServiceRequest> bookings = bookingService.getRequestsByUserId(userId);
        return ResponseEntity.ok(bookings.stream().map(this::toResponseDto).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        Optional<ServiceRequest> opt = bookingService.getRequestById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        ServiceRequest request = opt.get();
        return ResponseEntity.ok(toResponseDto(request));
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookServiceDto dto) {
        Long userId = getCurrentUserId();

        // Verify vehicle exists and belongs to current user
        Optional<Vehicle> vOpt = vehicleService.getVehicleById(dto.getVehicleId());
        if (vOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vehicle not found."));
        }
        if (!userId.equals(vOpt.get().getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied. You can only book services for your own vehicles."));
        }

        if (dto.getBookingDate().isBefore(LocalDate.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Booking date cannot be in the past."));
        }

        ServiceRequest request = new ServiceRequest();
        request.setVehicleId(dto.getVehicleId());
        request.setServiceCenterId(dto.getServiceCenterId());
        request.setBookingDate(dto.getBookingDate());
        request.setDescription(dto.getDescription() != null ? dto.getDescription() : "");
        request.setPackageId(dto.getPackageId());

        // Selected services (checkboxes) are the structured source of truth for what the
        // customer asked for. `serviceType` is kept as a short human-readable summary so
        // every existing screen that just displays `serviceType` (dashboards, invoices,
        // chat) continues to work unchanged, whether or not the caller sends serviceType
        // explicitly.
        List<String> selectedServices = dto.getSelectedServices() == null
                ? List.of()
                : dto.getSelectedServices().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(String::trim)
                        .collect(Collectors.toList());
        request.setSelectedServices(selectedServices);

        if (dto.getServiceType() != null && !dto.getServiceType().isBlank()) {
            request.setServiceType(dto.getServiceType());
        } else if (!selectedServices.isEmpty()) {
            String summary = String.join(", ", selectedServices);
            request.setServiceType(summary.length() > 100 ? summary.substring(0, 97) + "..." : summary);
        } else {
            request.setServiceType("General Service");
        }

        request.setStatus("PENDING");

        ServiceRequest created = bookingService.createRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Service booked successfully!", "id", created.getId()));
    }

    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Optional<ServiceRequest> opt = bookingService.getRequestById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ServiceRequest request = opt.get();
        Optional<Vehicle> vOpt = vehicleService.getVehicleById(request.getVehicleId());
        if (vOpt.isPresent() && !userId.equals(vOpt.get().getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied. You can only cancel your own bookings."));
        }

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Only PENDING bookings can be cancelled."));
        }

        bookingService.deleteRequest(id);
        return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully."));
    }

    // --- Service Center & Mechanic Operations ---

    @GetMapping("/service-center/{serviceCenterId}")
    public ResponseEntity<List<ServiceRequestResponseDto>> getBookingsByServiceCenter(@PathVariable Long serviceCenterId) {
        List<ServiceRequest> list = bookingService.getRequestsByServiceCenterId(serviceCenterId);
        return ResponseEntity.ok(list.stream().map(this::toResponseDto).collect(Collectors.toList()));
    }

    @GetMapping("/mechanic/jobs")
    public ResponseEntity<List<ServiceRequestResponseDto>> getMyMechanicJobs() {
        Long mechanicId = getCurrentUserId();
        List<ServiceRequest> jobs = bookingService.getRequestsByMechanicId(mechanicId);
        return ResponseEntity.ok(jobs.stream().map(this::toResponseDto).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/assign-mechanic")
    public ResponseEntity<?> assignMechanic(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long mechanicId = body.get("mechanicId");
        if (mechanicId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mechanic ID is required."));
        }
        boolean assigned = bookingService.assignMechanic(id, mechanicId);
        if (!assigned) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Mechanic assigned successfully!"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String notes = body.get("notes");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required."));
        }

        // Service Center handles business decisions (accept/reject/close out); the
        // Mechanic owns repair progress. Each role may only write into its own set of
        // values, so one can never overwrite the other's in-progress status - see the
        // two whitelists above.
        String role = getCurrentRole();
        if ("SERVICE_CENTER".equals(role) && !SERVICE_CENTER_STATUSES.contains(status)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Service Center can only Accept, Reject (Cancel), or mark a booking Completed. "
                            + "Repair progress is managed exclusively by the assigned Mechanic."));
        }
        if ("MECHANIC".equals(role) && !MECHANIC_STATUSES.contains(status)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Mechanics can only update repair progress stages."));
        }

        boolean updated = bookingService.updateRequestStatus(id, status, notes);
        if (!updated) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "Booking status updated to " + status + "!"));
    }

    @GetMapping
    public ResponseEntity<List<ServiceRequestResponseDto>> getAllBookings() {
        List<ServiceRequest> all = bookingService.getAllRequests();
        return ResponseEntity.ok(all.stream().map(this::toResponseDto).collect(Collectors.toList()));
    }
}
