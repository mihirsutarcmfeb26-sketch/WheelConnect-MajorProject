package com.wheelconnect.servicecenter.dto;

import java.util.List;

public class MapDTO {

    private Long id;
    private String name;
    private String address;
    private String phone;
    private String email;
    private Double latitude;
    private Double longitude;
    private Double distanceKm;
    private List<String> availableServices;
    private String workingHours;
    private Boolean isActive;

    public MapDTO() {}

    public MapDTO(Long id, String name, String address, String phone, String email,
                  Double latitude, Double longitude, Double distanceKm,
                  List<String> availableServices, String workingHours, Boolean isActive) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.email = email;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distanceKm = distanceKm;
        this.availableServices = availableServices;
        this.workingHours = workingHours;
        this.isActive = isActive;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public List<String> getAvailableServices() { return availableServices; }
    public void setAvailableServices(List<String> availableServices) { this.availableServices = availableServices; }

    public String getWorkingHours() { return workingHours; }
    public void setWorkingHours(String workingHours) { this.workingHours = workingHours; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
