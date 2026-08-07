package com.wheelconnect.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AddVehicleDto {

    @NotBlank(message = "Vehicle registration number is required")
    @Size(min = 4, max = 20, message = "Vehicle number length must be between 4 and 20 characters")
    @Pattern(regexp = "^[A-Za-z]{2}\\s?[0-9]{1,2}\\s?[A-Za-z]{0,3}\\s?[0-9]{4}$|^[A-Za-z0-9\\s\\-]{4,20}$",
             message = "Enter a valid vehicle registration number (e.g. MH12AB1234 or KA01MA5555)")
    private String vehicleNumber;

    @NotBlank(message = "Vehicle model is required")
    @Size(min = 2, max = 100, message = "Vehicle model must be between 2 and 100 characters")
    private String vehicleModel;

    @NotBlank(message = "Vehicle type is required")
    @Size(min = 2, max = 50, message = "Vehicle type must be between 2 and 50 characters")
    private String vehicleType;

    public AddVehicleDto() {}

    public AddVehicleDto(String vehicleNumber, String vehicleModel, String vehicleType) {
        this.vehicleNumber = vehicleNumber;
        this.vehicleModel = vehicleModel;
        this.vehicleType = vehicleType;
    }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
}
