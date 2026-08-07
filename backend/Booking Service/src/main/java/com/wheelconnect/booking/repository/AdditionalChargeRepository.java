package com.wheelconnect.booking.repository;

import com.wheelconnect.booking.entity.AdditionalCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdditionalChargeRepository extends JpaRepository<AdditionalCharge, Long> {

    List<AdditionalCharge> findByBookingId(Long bookingId);

    Optional<AdditionalCharge> findByApprovalToken(String approvalToken);
}
