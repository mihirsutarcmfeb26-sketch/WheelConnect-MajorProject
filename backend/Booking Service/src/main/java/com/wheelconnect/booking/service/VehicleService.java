package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.Vehicle;

import java.util.List;
import java.util.Optional;

public interface VehicleService {

    Vehicle addVehicle(Vehicle vehicle);

    Optional<Vehicle> getVehicleById(Long id);

    List<Vehicle> getVehiclesByUserId(Long userId);

    List<Vehicle> getAllVehicles();

    Vehicle updateVehicle(Vehicle vehicle);

    boolean deleteVehicle(Long id, Long userId);
}
