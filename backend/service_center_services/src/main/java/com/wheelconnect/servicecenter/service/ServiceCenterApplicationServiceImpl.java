package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.entity.ServiceCenter;
import com.wheelconnect.servicecenter.entity.ServiceCenterApplication;
import com.wheelconnect.servicecenter.exception.ResourceNotFoundException;
import com.wheelconnect.servicecenter.repository.ServiceCenterApplicationRepository;
import com.wheelconnect.servicecenter.repository.ServiceCenterRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ServiceCenterApplicationServiceImpl implements ServiceCenterApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ServiceCenterApplicationServiceImpl.class);

    private final ServiceCenterApplicationRepository applicationRepository;
    private final ServiceCenterRepository serviceCenterRepository;
    private final RestTemplate restTemplate;

    @Value("${services.auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    public ServiceCenterApplicationServiceImpl(
            ServiceCenterApplicationRepository applicationRepository,
            ServiceCenterRepository serviceCenterRepository) {
        this.applicationRepository = applicationRepository;
        this.serviceCenterRepository = serviceCenterRepository;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public ServiceCenterApplication submitApplication(ServiceCenterApplication application) {
        application.setStatus("PENDING");
        return applicationRepository.save(application);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceCenterApplication> getApplicationByUserId(Long userId) {
        return applicationRepository.findFirstByUserIdOrderByIdDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCenterApplication> getAllApplications() {
        return applicationRepository.findAllByOrderByIdDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceCenterApplication> getApplicationById(Long id) {
        return applicationRepository.findById(id);
    }

    @Override
    public ServiceCenterApplication approveApplication(Long id, String remarks) {
        ServiceCenterApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCenterApplication", "id", id));

        app.setStatus("APPROVED");
        if (remarks != null && !remarks.isBlank()) {
            app.setRemarks(remarks.trim());
        }
        ServiceCenterApplication savedApp = applicationRepository.save(app);

        // Resolve the ServiceCenter belonging to THIS application - not to this user.
        // A user may own several independent centers, so looking the center up by userId would
        // overwrite an existing center instead of creating the new one (and would blow up with
        // IncorrectResultSizeDataAccessException once the owner has more than one).
        // An application that has never been approved has no center yet, so one is created below.
        Optional<ServiceCenter> scOpt = (app.getServiceCenterId() != null)
                ? serviceCenterRepository.findById(app.getServiceCenterId())
                : Optional.empty();
        ServiceCenter sc;
        String formattedAddress = app.getAddress() + ", " + app.getCity() + ", " + app.getState() + " - " + app.getPincode();

        if (scOpt.isPresent()) {
            sc = scOpt.get();
            sc.setName(app.getServiceCenterName());
            sc.setAddress(formattedAddress);
            if (app.getUserPhone() != null && !app.getUserPhone().isBlank()) {
                sc.setPhone(app.getUserPhone());
            }
            if (app.getUserEmail() != null && !app.getUserEmail().isBlank()) {
                sc.setEmail(app.getUserEmail());
            }
            if (app.getServicesOffered() != null && !app.getServicesOffered().isEmpty()) {
                sc.setServicesOffered(new ArrayList<>(app.getServicesOffered()));
            }
            if (app.getLatitude() != null && app.getLongitude() != null) {
                sc.setLatitude(app.getLatitude());
                sc.setLongitude(app.getLongitude());
            } else {
                double[] coords = MapUtils.geocodeAddress(formattedAddress);
                if (coords != null) {
                    sc.setLatitude(coords[0]);
                    sc.setLongitude(coords[1]);
                }
            }
            sc.setIsActive(true);
        } else {
            sc = new ServiceCenter();
            sc.setName(app.getServiceCenterName());
            sc.setAddress(formattedAddress);
            sc.setPhone(app.getUserPhone() != null ? app.getUserPhone() : "");
            sc.setEmail(app.getUserEmail() != null ? app.getUserEmail() : "");
            sc.setUserId(app.getUserId());
            sc.setServicesOffered(app.getServicesOffered() != null ? new ArrayList<>(app.getServicesOffered()) : new ArrayList<>());
            if (app.getLatitude() != null && app.getLongitude() != null) {
                sc.setLatitude(app.getLatitude());
                sc.setLongitude(app.getLongitude());
            } else {
                double[] coords = MapUtils.geocodeAddress(formattedAddress);
                if (coords != null) {
                    sc.setLatitude(coords[0]);
                    sc.setLongitude(coords[1]);
                }
            }
            sc.setIsActive(true);
        }
        ServiceCenter savedSc = serviceCenterRepository.save(sc);

        // Record which center this application produced, so re-approving the same application
        // updates that center rather than creating a duplicate one.
        if (!savedSc.getId().equals(savedApp.getServiceCenterId())) {
            savedApp.setServiceCenterId(savedSc.getId());
            savedApp = applicationRepository.save(savedApp);
        }

        // Update user role to SERVICE_CENTER in auth-service
        try {
            String url = authServiceUrl + "/api/users/internal/" + app.getUserId() + "/promote-service-center?serviceCenterId=" + savedSc.getId();
            restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(new HttpHeaders()), String.class);
            log.info("Successfully updated user role to SERVICE_CENTER for userId: {}", app.getUserId());
        } catch (Exception e) {
            log.error("Failed to notify auth-service of user role promotion for userId: {}", app.getUserId(), e);
        }

        return savedApp;
    }

    @Override
    public ServiceCenterApplication rejectApplication(Long id, String remarks) {
        ServiceCenterApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCenterApplication", "id", id));

        app.setStatus("REJECTED");
        if (remarks != null && !remarks.isBlank()) {
            app.setRemarks(remarks.trim());
        }
        return applicationRepository.save(app);
    }
}
