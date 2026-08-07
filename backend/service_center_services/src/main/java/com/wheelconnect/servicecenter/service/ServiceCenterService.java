package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServiceCenter;

import java.util.List;
import java.util.Optional;

public interface ServiceCenterService {

    ServiceCenter createServiceCenter(ServiceCenter serviceCenter);

    Optional<ServiceCenter> getServiceCenterById(Long id);

    Optional<ServiceCenter> getServiceCenterByUserId(Long userId);

    List<ServiceCenter> getServiceCentersByUserId(Long userId);

    List<ServiceCenter> getAllServiceCenters();

    List<ServiceCenter> getActiveServiceCenters();

    ServiceCenter updateServiceCenter(ServiceCenter serviceCenter);

    boolean toggleActive(Long id);

    boolean deleteServiceCenter(Long id);
}
