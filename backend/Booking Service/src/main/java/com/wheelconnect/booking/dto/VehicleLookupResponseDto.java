package com.wheelconnect.booking.dto;

public class VehicleLookupResponseDto {

    private String vehicleNumber;
    private String vehicleModel;
    private String vehicleType;
    private boolean found;
    private String source;

    public VehicleLookupResponseDto() {}

    public VehicleLookupResponseDto(String vehicleNumber, String vehicleModel, String vehicleType, boolean found, String source) {
        this.vehicleNumber = vehicleNumber;
        this.vehicleModel = vehicleModel;
        this.vehicleType = vehicleType;
        this.found = found;
        this.source = source;
    }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public boolean isFound() { return found; }
    public void setFound(boolean found) { this.found = found; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
