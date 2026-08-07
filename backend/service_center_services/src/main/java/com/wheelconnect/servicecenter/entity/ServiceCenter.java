package com.wheelconnect.servicecenter.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_centers")
public class ServiceCenter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @NotBlank
    @Size(max = 150)
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Size(max = 300)
    @Column(name = "address", length = 300)
    private String address = "";

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone = "";

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * The services this center offers - a mix of predefined catalog service names
     * (e.g. "Oil Change") and free-form custom service names the center added itself.
     * Stored as a proper collection (its own join table, managed automatically by
     * Hibernate) instead of a single comma-separated text column.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_center_services", joinColumns = @JoinColumn(name = "service_center_id"))
    @Column(name = "service_name", length = 150)
    private List<String> servicesOffered = new ArrayList<>();

    public ServiceCenter() {}

    public ServiceCenter(Long id, String name, String address, String phone, String email, Double latitude, Double longitude, Boolean isActive, Long userId) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.email = email;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isActive = isActive;
        this.userId = userId;
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

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public List<String> getServicesOffered() { return servicesOffered; }
    public void setServicesOffered(List<String> servicesOffered) { this.servicesOffered = servicesOffered; }
}
