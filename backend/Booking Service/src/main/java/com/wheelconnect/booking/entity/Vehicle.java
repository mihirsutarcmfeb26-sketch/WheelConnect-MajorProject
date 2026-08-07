package com.wheelconnect.booking.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @NotBlank
    @Size(max = 20)
    @Column(name = "vehicle_number", nullable = false, length = 20)
    private String vehicleNumber;

    @NotBlank
    @Size(max = 100)
    @Column(name = "vehicle_model", nullable = false, length = 100)
    private String vehicleModel;

    @NotBlank
    @Size(max = 50)
    @Column(name = "vehicle_type", nullable = false, length = 50)
    private String vehicleType;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    public Vehicle() {}

    public Vehicle(Long id, String vehicleNumber, String vehicleModel, String vehicleType, Long userId) {
        this.id = id;
        this.vehicleNumber = vehicleNumber;
        this.vehicleModel = vehicleModel;
        this.vehicleType = vehicleType;
        this.userId = userId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}
