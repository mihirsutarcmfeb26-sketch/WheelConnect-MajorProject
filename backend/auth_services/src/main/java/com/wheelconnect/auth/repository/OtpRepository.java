package com.wheelconnect.auth.repository;

import com.wheelconnect.auth.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByUserIdAndIsUsedFalseOrderByCreatedAtDesc(Long userId);

    void deleteByUserId(Long userId);
}
