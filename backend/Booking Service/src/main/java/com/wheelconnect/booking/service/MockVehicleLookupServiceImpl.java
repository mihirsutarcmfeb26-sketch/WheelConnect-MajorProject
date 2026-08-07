package com.wheelconnect.booking.service;

import com.wheelconnect.booking.dto.VehicleLookupResponseDto;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MockVehicleLookupServiceImpl implements VehicleLookupService {

    private static final Map<String, String[]> REGISTRY = new HashMap<>();

    static {
        // Sample vehicle registration database
        REGISTRY.put("MH12AB1234", new String[]{"Honda City i-VTEC", "Sedan"});
        REGISTRY.put("MH14DT9999", new String[]{"Hyundai Creta SX", "SUV"});
        REGISTRY.put("KA01MA5555", new String[]{"Toyota Fortuner 4x4", "SUV"});
        REGISTRY.put("DL01CA1001", new String[]{"Maruti Suzuki Swift ZXi", "Hatchback"});
        REGISTRY.put("TN07CB4321", new String[]{"Tata Nexon EV", "Compact SUV"});
        REGISTRY.put("WB02AC7890", new String[]{"Mahindra Thar 4WD", "Off-Roader"});
    }

    @Override
    public VehicleLookupResponseDto lookupVehicle(String vehicleNumber) {
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            return new VehicleLookupResponseDto(vehicleNumber, null, null, false, "Manual Entry Required");
        }

        String normalized = vehicleNumber.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();

        if (REGISTRY.containsKey(normalized)) {
            String[] info = REGISTRY.get(normalized);
            return new VehicleLookupResponseDto(normalized, info[0], info[1], true, "WheelConnect Regional Vehicle Registry");
        }

        // Mock algorithmic lookup for demo numbers matching Indian pattern
        if (normalized.matches("^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$")) {
            String state = normalized.substring(0, 2);
            String model = getMockModelByState(state);
            String type = model.contains("Sedan") ? "Sedan" : (model.contains("SUV") ? "SUV" : "Hatchback");
            return new VehicleLookupResponseDto(normalized, model, type, true, "Mock National Vehicle Lookup");
        }

        // Fallback: lookup failure must allow manual entry without blocking booking
        return new VehicleLookupResponseDto(normalized, null, null, false, "Vehicle not found in registry. Please enter details manually.");
    }

    private String getMockModelByState(String stateCode) {
        switch (stateCode) {
            case "MH": return "Hyundai Verna SX";
            case "KA": return "Toyota Innova Crysta";
            case "DL": return "Maruti Suzuki Baleno";
            case "TN": return "Kia Seltos HTX";
            case "HR": return "Mahindra XUV700";
            default: return "Honda Civic 1.8";
        }
    }
}
