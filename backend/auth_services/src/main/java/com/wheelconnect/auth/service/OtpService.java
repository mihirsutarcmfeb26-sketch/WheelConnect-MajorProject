package com.wheelconnect.auth.service;

import com.wheelconnect.auth.entity.User;

public interface OtpService {

    String generateAndSendOtp(User user);

    boolean verifyOtp(User user, String rawOtp);

    boolean canResendOtp(User user);
}
