package com.wheelconnect.booking.controller;

import com.wheelconnect.booking.dto.ProposeChargeDto;
import com.wheelconnect.booking.dto.RespondChargeDto;
import com.wheelconnect.booking.entity.AdditionalCharge;
import com.wheelconnect.booking.exception.ResourceNotFoundException;
import com.wheelconnect.booking.service.AdditionalChargeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/charges")
public class ChargeController {

    private final AdditionalChargeService chargeService;

    public ChargeController(AdditionalChargeService chargeService) {
        this.chargeService = chargeService;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    @PostMapping("/propose")
    public ResponseEntity<?> proposeCharge(@Valid @RequestBody ProposeChargeDto dto) {
        Long userId = getCurrentUserId();
        AdditionalCharge charge = new AdditionalCharge();
        charge.setBookingId(dto.getBookingId());
        charge.setDescription(dto.getDescription());
        charge.setAmount(dto.getAmount());
        charge.setRequestedByUserId(userId);

        AdditionalCharge created = chargeService.proposeCharge(charge);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Additional charge proposal submitted. Customer approval is required.",
                        "chargeId", created.getId(),
                        "approvalToken", created.getApprovalToken()));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<AdditionalCharge>> getChargesForBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(chargeService.getChargesByBookingId(bookingId));
    }

    @GetMapping("/approve/{approvalToken}")
    public ResponseEntity<?> getChargeDetailsByToken(@PathVariable String approvalToken) {
        return chargeService.getChargeByApprovalToken(approvalToken)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/approve/{approvalToken}")
    public ResponseEntity<?> respondToCharge(@PathVariable String approvalToken, @Valid @RequestBody RespondChargeDto dto) {
        Long userId = getCurrentUserId();
        AdditionalCharge updated = chargeService.respondToCharge(approvalToken, dto.getStatus(), userId);
        return ResponseEntity.ok(Map.of(
                "message", "Charge proposal has been " + updated.getStatus().toLowerCase() + ".",
                "status", updated.getStatus(),
                "charge", updated
        ));
    }
}
