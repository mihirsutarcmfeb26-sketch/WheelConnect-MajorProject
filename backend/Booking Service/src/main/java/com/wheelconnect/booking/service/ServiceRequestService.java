package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.ServiceRequest;

import java.util.List;
import java.util.Optional;

public interface ServiceRequestService {

    ServiceRequest createRequest(ServiceRequest request);

    Optional<ServiceRequest> getRequestById(Long id);

    List<ServiceRequest> getAllRequests();

    List<ServiceRequest> getRequestsByVehicleId(Long vehicleId);

    List<ServiceRequest> getRequestsByUserId(Long userId);

    List<ServiceRequest> getRequestsByServiceCenterId(Long serviceCenterId);

    List<ServiceRequest> getRequestsByMechanicId(Long mechanicId);

    ServiceRequest updateRequest(ServiceRequest request);

    boolean deleteRequest(Long id);

    boolean updateRequestStatus(Long id, String status, String notes);

    boolean assignMechanic(Long requestId, Long mechanicId);
}
