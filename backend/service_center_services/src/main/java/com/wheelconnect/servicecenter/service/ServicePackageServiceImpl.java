package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServicePackage;
import com.wheelconnect.servicecenter.repository.ServicePackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ServicePackageServiceImpl implements ServicePackageService {

    private final ServicePackageRepository servicePackageRepository;

    public ServicePackageServiceImpl(ServicePackageRepository servicePackageRepository) {
        this.servicePackageRepository = servicePackageRepository;
    }

    @Override
    public ServicePackage createPackage(ServicePackage servicePackage) {
        return servicePackageRepository.save(servicePackage);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServicePackage> getPackageById(Long id) {
        return servicePackageRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicePackage> getAllPackages() {
        return servicePackageRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicePackage> getPackagesByServiceCenterId(Long serviceCenterId) {
        return servicePackageRepository.findByServiceCenterId(serviceCenterId);
    }

    @Override
    public ServicePackage updatePackage(ServicePackage servicePackage) {
        return servicePackageRepository.save(servicePackage);
    }

    @Override
    public boolean deletePackage(Long id) {
        if (!servicePackageRepository.existsById(id)) return false;
        servicePackageRepository.deleteById(id);
        return true;
    }
}
