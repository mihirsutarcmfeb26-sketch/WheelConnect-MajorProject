package com.wheelconnect.servicecenter.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_center_applications")
public class ServiceCenterApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_name", length = 100)
    private String userName;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "user_phone", length = 20)
    private String userPhone;

    @NotBlank
    @Column(name = "service_center_name", nullable = false, length = 150)
    private String serviceCenterName;

    @NotBlank
    @Column(name = "address", nullable = false, length = 300)
    private String address;

    @NotBlank
    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @NotBlank
    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @NotBlank
    @Column(name = "pincode", nullable = false, length = 20)
    private String pincode;

    @NotBlank
    @Column(name = "working_hours", nullable = false, length = 100)
    private String workingHours;

    /**
     * The services this applicant is applying to offer - a mix of predefined catalog
     * service names and custom service names. Stored as a proper collection (its own
     * join table) instead of a single comma-separated text column.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_center_application_services", joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "service_name", length = 150)
    @NotEmpty(message = "At least one service must be selected")
    private List<String> servicesOffered = new ArrayList<>();

    // Optional Fields
    @Column(name = "gst_number", length = 50)
    private String gstNumber;

    @Column(name = "business_license", length = 255)
    private String businessLicense;

    @Column(name = "registration_certificate", length = 255)
    private String registrationCertificate;

    @Column(name = "garage_photos", length = 500)
    private String garagePhotos;

    @Column(name = "profile_image", length = 255)
    private String profileImage;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    // PENDING, APPROVED, REJECTED
    @NotBlank
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "remarks", length = 500)
    private String remarks;

    /**
     * The ServiceCenter this application produced once it was approved, or null while the
     * application is still PENDING/REJECTED.
     *
     * A user may own many service centers, so "which center does this application belong to?"
     * cannot be answered by looking the user up - it has to be recorded per application.
     * Approving an application populates this; re-approving the same application updates that
     * same center instead of creating a duplicate.
     */
    @Column(name = "service_center_id")
    private Long serviceCenterId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ServiceCenterApplication() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }

    public String getServiceCenterName() { return serviceCenterName; }
    public void setServiceCenterName(String serviceCenterName) { this.serviceCenterName = serviceCenterName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getWorkingHours() { return workingHours; }
    public void setWorkingHours(String workingHours) { this.workingHours = workingHours; }

    public List<String> getServicesOffered() { return servicesOffered; }
    public void setServicesOffered(List<String> servicesOffered) { this.servicesOffered = servicesOffered; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public String getBusinessLicense() { return businessLicense; }
    public void setBusinessLicense(String businessLicense) { this.businessLicense = businessLicense; }

    public String getRegistrationCertificate() { return registrationCertificate; }
    public void setRegistrationCertificate(String registrationCertificate) { this.registrationCertificate = registrationCertificate; }

    public String getGaragePhotos() { return garagePhotos; }
    public void setGaragePhotos(String garagePhotos) { this.garagePhotos = garagePhotos; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Long getServiceCenterId() { return serviceCenterId; }
    public void setServiceCenterId(Long serviceCenterId) { this.serviceCenterId = serviceCenterId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
