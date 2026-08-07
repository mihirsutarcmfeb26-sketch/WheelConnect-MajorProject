package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.dto.ServiceCenterLocationDto;
import com.wheelconnect.servicecenter.entity.ServiceCenter;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LocationService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /**
     * Calculates distance between two lat/lng points using Haversine formula.
     */
    public double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(EARTH_RADIUS_KM * c * 10.0) / 10.0;
    }

    public List<ServiceCenterLocationDto> findNearbyCenters(List<ServiceCenter> centers, Double userLat, Double userLng) {
        return centers.stream()
                .map(sc -> {
                    Double dist = null;
                    if (userLat != null && userLng != null && sc.getLatitude() != null && sc.getLongitude() != null) {
                        dist = calculateDistanceKm(userLat, userLng, sc.getLatitude(), sc.getLongitude());
                    }
                    return new ServiceCenterLocationDto(
                            sc.getId(), sc.getName(), sc.getAddress(), sc.getPhone(),
                            sc.getEmail(), sc.getLatitude(), sc.getLongitude(), dist
                    );
                })
                .sorted(Comparator.comparing(sc -> sc.getDistanceKm() == null ? Double.MAX_VALUE : sc.getDistanceKm()))
                .collect(Collectors.toList());
    }
}
