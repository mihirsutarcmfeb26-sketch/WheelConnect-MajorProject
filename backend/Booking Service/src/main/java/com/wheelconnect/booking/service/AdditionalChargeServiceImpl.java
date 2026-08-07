package com.wheelconnect.booking.service;

import com.wheelconnect.booking.entity.AdditionalCharge;
import com.wheelconnect.booking.entity.ServiceRequest;
import com.wheelconnect.booking.exception.ResourceNotFoundException;
import com.wheelconnect.booking.repository.AdditionalChargeRepository;
import com.wheelconnect.booking.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AdditionalChargeServiceImpl implements AdditionalChargeService {

    private final AdditionalChargeRepository chargeRepository;
    private final ServiceRequestRepository bookingRepository;

    public AdditionalChargeServiceImpl(AdditionalChargeRepository chargeRepository, ServiceRequestRepository bookingRepository) {
        this.chargeRepository = chargeRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    public AdditionalCharge proposeCharge(AdditionalCharge charge) {
        if (charge.getAmount() == null || charge.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Additional charge amount must be greater than zero.");
        }
        if (charge.getDescription() == null || charge.getDescription().isBlank()) {
            throw new IllegalArgumentException("Additional charge description cannot be blank.");
        }

        ServiceRequest booking = bookingRepository.findById(charge.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", charge.getBookingId()));

        if ("COMPLETED".equals(booking.getStatus()) || "CANCELLED".equals(booking.getStatus())) {
            throw new IllegalArgumentException("Cannot propose additional charge for a completed or cancelled booking.");
        }

        charge.setStatus("PENDING");
        charge.setApprovalToken(UUID.randomUUID().toString());
        charge.setExpiresAt(LocalDateTime.now().plusDays(2)); // Token valid for 48 hours
        charge.setRequestedAt(LocalDateTime.now());

        return chargeRepository.save(charge);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdditionalCharge> getChargesByBookingId(Long bookingId) {
        return chargeRepository.findByBookingId(bookingId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AdditionalCharge> getChargeByApprovalToken(String approvalToken) {
        return chargeRepository.findByApprovalToken(approvalToken);
    }

    @Override
    public AdditionalCharge respondToCharge(String approvalToken, String status, Long currentUserId) {
        AdditionalCharge charge = chargeRepository.findByApprovalToken(approvalToken)
                .orElseThrow(() -> new ResourceNotFoundException("Additional charge request not found or token invalid."));

        if (!"PENDING".equals(charge.getStatus())) {
            throw new IllegalArgumentException("This charge request has already been " + charge.getStatus().toLowerCase() + ".");
        }

        if (LocalDateTime.now().isAfter(charge.getExpiresAt())) {
            charge.setStatus("EXPIRED");
            chargeRepository.save(charge);
            throw new IllegalArgumentException("The approval link for this additional charge has expired.");
        }

        if (!"APPROVED".equalsIgnoreCase(status) && !"REJECTED".equalsIgnoreCase(status)) {
            throw new IllegalArgumentException("Status must be APPROVED or REJECTED.");
        }

        charge.setStatus(status.toUpperCase());
        charge.setRespondedAt(LocalDateTime.now());
        return chargeRepository.save(charge);
    }
}
