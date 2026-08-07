package com.wheelconnect.booking.repository;

import com.wheelconnect.booking.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByVehicleId(Long vehicleId);

    List<ServiceRequest> findByVehicleIdIn(List<Long> vehicleIds);

    List<ServiceRequest> findByServiceCenterId(Long serviceCenterId);

    List<ServiceRequest> findByMechanicId(Long mechanicId);
}
