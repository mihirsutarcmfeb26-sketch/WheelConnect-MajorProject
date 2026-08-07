package com.wheelconnect.auth.service;

public interface EmailService {

    void sendOtpEmail(String toEmail, String otpCode);

    void sendEmail(String toEmail, String subject, String body);
}
