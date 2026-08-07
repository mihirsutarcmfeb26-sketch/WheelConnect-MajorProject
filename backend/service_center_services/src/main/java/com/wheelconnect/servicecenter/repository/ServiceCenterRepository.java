package com.wheelconnect.servicecenter.repository;

import com.wheelconnect.servicecenter.entity.ServiceCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCenterRepository extends JpaRepository<ServiceCenter, Long> {

    /**
     * A user may own MANY service centers, so there is deliberately no single-result
     * findByUserId(Long) here - an Optional-returning derived query on user_id throws
     * IncorrectResultSizeDataAccessException as soon as an owner registers a second center.
     * Use findAllByUserId for the full list, or findFirstByUserId when only the owner's
     * primary/oldest center is needed.
     */
    List<ServiceCenter> findAllByUserId(Long userId);

    Optional<ServiceCenter> findFirstByUserId(Long userId);

    List<ServiceCenter> findByIsActiveTrue();
}
