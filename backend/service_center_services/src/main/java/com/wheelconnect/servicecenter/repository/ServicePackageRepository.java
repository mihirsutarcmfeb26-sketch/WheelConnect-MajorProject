package com.wheelconnect.servicecenter.repository;

import com.wheelconnect.servicecenter.entity.ServicePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServicePackageRepository extends JpaRepository<ServicePackage, Long> {

    List<ServicePackage> findByServiceCenterId(Long serviceCenterId);
}
