package com.wheelconnect.booking.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @NotNull
    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @NotBlank
    @Size(max = 100)
    @Column(name = "service_type", nullable = false, length = 100)
    private String serviceType;

    @NotNull
    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @NotBlank
    @Size(max = 50)
    @Column(name = "status", nullable = false, length = 50)
    private String status = "PENDING";

    @Size(max = 500)
    @Column(name = "description", length = 500)
    private String description = "";

    @Size(max = 500)
    @Column(name = "notes", length = 500)
    private String notes = "";

    @Column(name = "service_center_id")
    private Long serviceCenterId;

    @Column(name = "mechanic_id")
    private Long mechanicId;

    @Column(name = "package_id")
    private Long packageId;

    /**
     * The individual services the customer selected for this booking (checkboxes from
     * the service center's available services). `serviceType` above is kept as a short
     * human-readable summary (derived from this list) so every existing screen that just
     * displays `serviceType` keeps working unchanged; this list is the structured source
     * of truth for "exactly which services were selected."
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_request_selected_services", joinColumns = @JoinColumn(name = "service_request_id"))
    @Column(name = "service_name", length = 150)
    private List<String> selectedServices = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public ServiceRequest() {}

    public ServiceRequest(Long id, Long vehicleId, String serviceType, LocalDate bookingDate, String status,
                          String description, String notes, Long serviceCenterId, Long mechanicId, Long packageId) {
        this.id = id;
        this.vehicleId = vehicleId;
        this.serviceType = serviceType;
        this.bookingDate = bookingDate;
        this.status = status;
        this.description = description;
        this.notes = notes;
        this.serviceCenterId = serviceCenterId;
        this.mechanicId = mechanicId;
        this.packageId = packageId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public LocalDate getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDate bookingDate) { this.bookingDate = bookingDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getServiceCenterId() { return serviceCenterId; }
    public void setServiceCenterId(Long serviceCenterId) { this.serviceCenterId = serviceCenterId; }

    public Long getMechanicId() { return mechanicId; }
    public void setMechanicId(Long mechanicId) { this.mechanicId = mechanicId; }

    public Long getPackageId() { return packageId; }
    public void setPackageId(Long packageId) { this.packageId = packageId; }

    public List<String> getSelectedServices() { return selectedServices; }
    public void setSelectedServices(List<String> selectedServices) { this.selectedServices = selectedServices; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
