package com.wheelconnect.servicecenter.service;

import com.wheelconnect.servicecenter.dto.MapDTO;
import com.wheelconnect.servicecenter.entity.ServiceCenter;
import com.wheelconnect.servicecenter.entity.ServicePackage;
import com.wheelconnect.servicecenter.exception.ResourceNotFoundException;
import com.wheelconnect.servicecenter.repository.ServiceCenterRepository;
import com.wheelconnect.servicecenter.repository.ServicePackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MapService {

    private final ServiceCenterRepository serviceCenterRepository;
    private final ServicePackageRepository servicePackageRepository;

    public MapService(ServiceCenterRepository serviceCenterRepository, ServicePackageRepository servicePackageRepository) {
        this.serviceCenterRepository = serviceCenterRepository;
        this.servicePackageRepository = servicePackageRepository;
    }

    @Transactional
    public List<MapDTO> getMapServiceCenters(Double customerLat, Double customerLng) {
        List<ServiceCenter> activeCenters = serviceCenterRepository.findByIsActiveTrue();

        return activeCenters.stream()
                .map(sc -> processAndConvertToMapDTO(sc, customerLat, customerLng))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<MapDTO> getNearbyServiceCenters(Double customerLat, Double customerLng) {
        List<MapDTO> mapDTOs = getMapServiceCenters(customerLat, customerLng);

        return mapDTOs.stream()
                .sorted(Comparator.comparing(dto -> dto.getDistanceKm() == null ? Double.MAX_VALUE : dto.getDistanceKm()))
                .collect(Collectors.toList());
    }

    @Transactional
    public MapDTO getServiceCenterLocation(Long id, Double customerLat, Double customerLng) {
        ServiceCenter center = serviceCenterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceCenter", "id", id));

        return processAndConvertToMapDTO(center, customerLat, customerLng);
    }

    private MapDTO processAndConvertToMapDTO(ServiceCenter sc, Double customerLat, Double customerLng) {
        // Automatic Geocoding if coordinates do not exist & store to database.
        // Uses a real geocoding lookup (Google if configured, otherwise free OSM
        // Nominatim) - if no provider can resolve the address, coordinates are left
        // unset rather than substituting a fabricated location.
        if (sc.getLatitude() == null || sc.getLongitude() == null) {
            double[] coords = MapUtils.geocodeAddress(sc.getAddress());
            if (coords != null) {
                sc.setLatitude(coords[0]);
                sc.setLongitude(coords[1]);
                serviceCenterRepository.save(sc); // Save to DB to avoid repeated geocoding
            }
        }

        Double dist = null;
        if (customerLat != null && customerLng != null && sc.getLatitude() != null && sc.getLongitude() != null) {
            dist = MapUtils.calculateDistanceKm(customerLat, customerLng, sc.getLatitude(), sc.getLongitude());
        }

        // Fetch packages/services for this center
        List<ServicePackage> packages = servicePackageRepository.findByServiceCenterId(sc.getId());
        List<String> packageNames = packages.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .map(ServicePackage::getName)
                .collect(Collectors.toList());

        // "Available Services" shown to customers now comes from the service center's own
        // selected services list (predefined + custom, set at registration/edit time). Active
        // paid packages are still included too, since a center may price some services as
        // packages. If neither is set yet, fall back to a generic default list so older
        // centers created before this feature still show something reasonable.
        List<String> availableServices = new ArrayList<>();
        if (sc.getServicesOffered() != null) {
            availableServices.addAll(sc.getServicesOffered());
        }
        for (String packageName : packageNames) {
            if (!availableServices.contains(packageName)) {
                availableServices.add(packageName);
            }
        }
        if (availableServices.isEmpty()) {
            availableServices = List.of("General Inspection", "Full Service", "Brake & Tyre Check", "Oil Change");
        }

        String workingHours = "09:00 AM - 08:00 PM (Mon-Sat)";

        return new MapDTO(
                sc.getId(),
                sc.getName(),
                sc.getAddress(),
                sc.getPhone(),
                sc.getEmail(),
                sc.getLatitude(),
                sc.getLongitude(),
                dist,
                availableServices,
                workingHours,
                sc.getIsActive()
        );
    }
}
