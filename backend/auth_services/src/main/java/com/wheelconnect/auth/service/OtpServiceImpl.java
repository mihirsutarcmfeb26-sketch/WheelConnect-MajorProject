package com.wheelconnect.auth.service;

import com.wheelconnect.auth.entity.OtpVerification;
import com.wheelconnect.auth.entity.User;
import com.wheelconnect.auth.repository.OtpRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class OtpServiceImpl implements OtpService {

    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    @Value("${otp.expiration-minutes:5}")
    private int expirationMinutes;

    @Value("${otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${otp.resend-cooldown-seconds:30}")
    private int resendCooldownSeconds;

    public OtpServiceImpl(OtpRepository otpRepository, EmailService emailService, PasswordEncoder passwordEncoder) {
        this.otpRepository = otpRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public String generateAndSendOtp(User user) {
        // Mark any old unused OTPs as used/invalid
        Optional<OtpVerification> oldOpt = otpRepository.findTopByUserIdAndIsUsedFalseOrderByCreatedAtDesc(user.getId());
        oldOpt.ifPresent(oldOtp -> {
            oldOtp.setIsUsed(true);
            otpRepository.save(oldOtp);
        });

        // Generate 6-digit numeric OTP
        int code = 100000 + random.nextInt(900000);
        String rawOtp = String.valueOf(code);

        OtpVerification otpVerification = new OtpVerification();
        otpVerification.setUserId(user.getId());
        otpVerification.setEmail(user.getEmail());
        otpVerification.setOtpHash(passwordEncoder.encode(rawOtp));
        otpVerification.setExpiresAt(LocalDateTime.now().plusMinutes(expirationMinutes));
        otpVerification.setIsUsed(false);
        otpVerification.setAttempts(0);
        otpRepository.save(otpVerification);

        // Send OTP via email/logger
        emailService.sendOtpEmail(user.getEmail(), rawOtp);

        return rawOtp;
    }

    @Override
    public boolean verifyOtp(User user, String rawOtp) {
        Optional<OtpVerification> opt = otpRepository.findTopByUserIdAndIsUsedFalseOrderByCreatedAtDesc(user.getId());
        if (opt.isEmpty()) {
            return false;
        }

        OtpVerification otpVerification = opt.get();

        // Expiry check
        if (LocalDateTime.now().isAfter(otpVerification.getExpiresAt())) {
            otpVerification.setIsUsed(true);
            otpRepository.save(otpVerification);
            return false;
        }

        // Attempt limit check
        if (otpVerification.getAttempts() >= maxAttempts) {
            otpVerification.setIsUsed(true);
            otpRepository.save(otpVerification);
            return false;
        }

        otpVerification.setAttempts(otpVerification.getAttempts() + 1);

        // Validate hash
        if (passwordEncoder.matches(rawOtp, otpVerification.getOtpHash())) {
            otpVerification.setIsUsed(true);
            otpRepository.save(otpVerification);
            return true;
        } else {
            otpRepository.save(otpVerification);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canResendOtp(User user) {
        Optional<OtpVerification> opt = otpRepository.findTopByUserIdAndIsUsedFalseOrderByCreatedAtDesc(user.getId());
        if (opt.isEmpty()) return true;

        LocalDateTime lastCreated = opt.get().getCreatedAt();
        return LocalDateTime.now().isAfter(lastCreated.plusSeconds(resendCooldownSeconds));
    }
}
