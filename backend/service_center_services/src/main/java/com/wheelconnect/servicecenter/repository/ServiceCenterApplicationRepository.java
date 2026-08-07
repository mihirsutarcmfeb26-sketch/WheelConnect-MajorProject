package com.wheelconnect.servicecenter.repository;

import com.wheelconnect.servicecenter.entity.ServiceCenterApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCenterApplicationRepository extends JpaRepository<ServiceCenterApplication, Long> {
    List<ServiceCenterApplication> findByUserIdOrderByIdDesc(Long userId);
    Optional<ServiceCenterApplication> findFirstByUserIdOrderByIdDesc(Long userId);
    List<ServiceCenterApplication> findAllByOrderByIdDesc();
}
