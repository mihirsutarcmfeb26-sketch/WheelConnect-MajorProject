package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServiceCenter;
import com.wheelconnect.servicecenter.repository.ServiceCenterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ServiceCenterServiceImpl implements ServiceCenterService {

    private final ServiceCenterRepository serviceCenterRepository;

    public ServiceCenterServiceImpl(ServiceCenterRepository serviceCenterRepository) {
        this.serviceCenterRepository = serviceCenterRepository;
    }

    @Override
    public ServiceCenter createServiceCenter(ServiceCenter serviceCenter) {
        // If coordinates weren't explicitly provided, resolve real coordinates from the
        // service center's address via geocoding (Google if configured, otherwise the
        // free OpenStreetMap Nominatim service). No fabricated fallback location is used;
        // if geocoding can't resolve the address, coordinates are left unset and will be
        // retried automatically the next time this center is read via the map endpoints.
        if ((serviceCenter.getLatitude() == null || serviceCenter.getLongitude() == null)
                && serviceCenter.getAddress() != null && !serviceCenter.getAddress().isBlank()) {
            double[] coords = MapUtils.geocodeAddress(serviceCenter.getAddress());
            if (coords != null) {
                serviceCenter.setLatitude(coords[0]);
                serviceCenter.setLongitude(coords[1]);
            }
        }
        return serviceCenterRepository.save(serviceCenter);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceCenter> getServiceCenterById(Long id) {
        return serviceCenterRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceCenter> getServiceCenterByUserId(Long userId) {
        return serviceCenterRepository.findFirstByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCenter> getServiceCentersByUserId(Long userId) {
        return serviceCenterRepository.findAllByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCenter> getAllServiceCenters() {
        return serviceCenterRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCenter> getActiveServiceCenters() {
        return serviceCenterRepository.findByIsActiveTrue();
    }

    @Override
    public ServiceCenter updateServiceCenter(ServiceCenter serviceCenter) {
        return serviceCenterRepository.save(serviceCenter);
    }

    @Override
    public boolean toggleActive(Long id) {
        Optional<ServiceCenter> scOpt = serviceCenterRepository.findById(id);
        if (scOpt.isEmpty()) return false;
        ServiceCenter sc = scOpt.get();
        sc.setIsActive(!Boolean.TRUE.equals(sc.getIsActive()));
        serviceCenterRepository.save(sc);
        return true;
    }

    @Override
    public boolean deleteServiceCenter(Long id) {
        if (!serviceCenterRepository.existsById(id)) return false;
        serviceCenterRepository.deleteById(id);
        return true;
    }
}
