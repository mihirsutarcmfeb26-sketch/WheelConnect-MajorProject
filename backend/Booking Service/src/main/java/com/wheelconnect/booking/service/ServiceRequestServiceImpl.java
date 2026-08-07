package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.ServiceRequest;
import com.wheelconnect.booking.entity.Vehicle;
import com.wheelconnect.booking.repository.ServiceRequestRepository;
import com.wheelconnect.booking.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ServiceRequestServiceImpl implements ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final VehicleRepository vehicleRepository;

    public ServiceRequestServiceImpl(ServiceRequestRepository serviceRequestRepository, VehicleRepository vehicleRepository) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    public ServiceRequest createRequest(ServiceRequest request) {
        if (request.getBookingDate() != null && request.getBookingDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Booking date cannot be in the past.");
        }
        request.setStatus("PENDING");
        return serviceRequestRepository.save(request);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceRequest> getRequestById(Long id) {
        return serviceRequestRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequest> getAllRequests() {
        return serviceRequestRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequest> getRequestsByVehicleId(Long vehicleId) {
        return serviceRequestRepository.findByVehicleId(vehicleId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequest> getRequestsByUserId(Long userId) {
        List<Vehicle> userVehicles = vehicleRepository.findByUserId(userId);
        if (userVehicles.isEmpty()) return List.of();
        List<Long> vehicleIds = userVehicles.stream().map(Vehicle::getId).collect(Collectors.toList());
        return serviceRequestRepository.findByVehicleIdIn(vehicleIds);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequest> getRequestsByServiceCenterId(Long serviceCenterId) {
        return serviceRequestRepository.findByServiceCenterId(serviceCenterId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequest> getRequestsByMechanicId(Long mechanicId) {
        return serviceRequestRepository.findByMechanicId(mechanicId);
    }

    @Override
    public ServiceRequest updateRequest(ServiceRequest request) {
        return serviceRequestRepository.save(request);
    }

    @Override
    public boolean deleteRequest(Long id) {
        if (!serviceRequestRepository.existsById(id)) return false;
        serviceRequestRepository.deleteById(id);
        return true;
    }

    @Override
    public boolean updateRequestStatus(Long id, String status, String notes) {
        Optional<ServiceRequest> opt = serviceRequestRepository.findById(id);
        if (opt.isEmpty()) return false;
        ServiceRequest request = opt.get();
        request.setStatus(status);
        if (notes != null && !notes.isBlank()) {
            request.setNotes(notes);
        }
        serviceRequestRepository.save(request);
        return true;
    }

    @Override
    public boolean assignMechanic(Long requestId, Long mechanicId) {
        Optional<ServiceRequest> opt = serviceRequestRepository.findById(requestId);
        if (opt.isEmpty()) return false;
        ServiceRequest request = opt.get();
        request.setMechanicId(mechanicId);
        request.setStatus("MECHANIC_ASSIGNED");
        serviceRequestRepository.save(request);
        return true;
    }
}
