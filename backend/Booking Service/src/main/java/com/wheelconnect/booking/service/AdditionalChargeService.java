package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.AdditionalCharge;

import java.util.List;
import java.util.Optional;

public interface AdditionalChargeService {

    AdditionalCharge proposeCharge(AdditionalCharge charge);

    List<AdditionalCharge> getChargesByBookingId(Long bookingId);

    Optional<AdditionalCharge> getChargeByApprovalToken(String approvalToken);

    AdditionalCharge respondToCharge(String approvalToken, String status, Long currentUserId);
}
