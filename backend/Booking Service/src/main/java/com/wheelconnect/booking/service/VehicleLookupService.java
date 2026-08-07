package com.wheelconnect.booking.service;

import com.wheelconnect.booking.dto.VehicleLookupResponseDto;

public interface VehicleLookupService {

    VehicleLookupResponseDto lookupVehicle(String vehicleNumber);
}
