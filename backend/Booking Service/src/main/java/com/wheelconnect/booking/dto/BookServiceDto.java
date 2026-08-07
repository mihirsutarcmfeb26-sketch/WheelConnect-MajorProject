package com.wheelconnect.booking.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public class BookServiceDto {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @NotNull(message = "Service center ID is required")
    private Long serviceCenterId;

    private String serviceType;

    private Long packageId;

    @NotNull(message = "Booking date is required")
    @FutureOrPresent(message = "Booking date cannot be in the past")
    private LocalDate bookingDate;

    private String description;

    /** The individual services the customer checked from the service center's list. */
    private List<String> selectedServices;

    public BookServiceDto() {}

    public BookServiceDto(Long vehicleId, Long serviceCenterId, String serviceType, Long packageId, LocalDate bookingDate, String description) {
        this.vehicleId = vehicleId;
        this.serviceCenterId = serviceCenterId;
        this.serviceType = serviceType;
        this.packageId = packageId;
        this.bookingDate = bookingDate;
        this.description = description;
    }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public Long getServiceCenterId() { return serviceCenterId; }
    public void setServiceCenterId(Long serviceCenterId) { this.serviceCenterId = serviceCenterId; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public Long getPackageId() { return packageId; }
    public void setPackageId(Long packageId) { this.packageId = packageId; }

    public LocalDate getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDate bookingDate) { this.bookingDate = bookingDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getSelectedServices() { return selectedServices; }
    public void setSelectedServices(List<String> selectedServices) { this.selectedServices = selectedServices; }
}
