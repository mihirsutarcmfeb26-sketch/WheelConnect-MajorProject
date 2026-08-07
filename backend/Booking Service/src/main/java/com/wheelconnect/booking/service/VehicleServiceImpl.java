package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.Vehicle;
import com.wheelconnect.booking.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleServiceImpl(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    public Vehicle addVehicle(Vehicle vehicle) {
        vehicle.setVehicleNumber(vehicle.getVehicleNumber().toUpperCase().trim());
        vehicle.setVehicleModel(vehicle.getVehicleModel().trim());
        return vehicleRepository.save(vehicle);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Vehicle> getVehicleById(Long id) {
        return vehicleRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Vehicle> getVehiclesByUserId(Long userId) {
        return vehicleRepository.findByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    @Override
    public Vehicle updateVehicle(Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }

    @Override
    public boolean deleteVehicle(Long id, Long userId) {
        Optional<Vehicle> opt = vehicleRepository.findById(id);
        if (opt.isEmpty()) return false;
        // Ownership check
        if (userId != null && !userId.equals(opt.get().getUserId())) {
            throw new IllegalArgumentException("Access denied. You can only delete your own vehicles.");
        }
        vehicleRepository.deleteById(id);
        return true;
    }
}
