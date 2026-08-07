package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServicePackage;

import java.util.List;
import java.util.Optional;

public interface ServicePackageService {

    ServicePackage createPackage(ServicePackage servicePackage);

    Optional<ServicePackage> getPackageById(Long id);

    List<ServicePackage> getAllPackages();

    List<ServicePackage> getPackagesByServiceCenterId(Long serviceCenterId);

    ServicePackage updatePackage(ServicePackage servicePackage);

    boolean deletePackage(Long id);
}
