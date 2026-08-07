package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServiceCenterApplication;

import java.util.List;
import java.util.Optional;

public interface ServiceCenterApplicationService {
    ServiceCenterApplication submitApplication(ServiceCenterApplication application);
    Optional<ServiceCenterApplication> getApplicationByUserId(Long userId);
    List<ServiceCenterApplication> getAllApplications();
    Optional<ServiceCenterApplication> getApplicationById(Long id);
    ServiceCenterApplication approveApplication(Long id, String remarks);
    ServiceCenterApplication rejectApplication(Long id, String remarks);
}
