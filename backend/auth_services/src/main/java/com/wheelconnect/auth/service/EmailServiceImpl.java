package com.wheelconnect.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtpEmail(String toEmail, String otpCode) {
        String subject = "WheelConnect - Your 2FA Authentication OTP Code";
        String body = "Hello,\n\n" +
                "Your WheelConnect One-Time Password (OTP) for login verification is:\n\n" +
                "    " + otpCode + "\n\n" +
                "This code will expire in 5 minutes. Do not share this OTP with anyone.\n\n" +
                "Best regards,\nWheelConnect Team";

        sendEmail(toEmail, subject, body);
    }

    @Override
    public void sendEmail(String toEmail, String subject, String body) {
        log.info("========== [EMAIL SENDER] ==========");
        log.info("TO: {}", toEmail);
        log.info("SUBJECT: {}", subject);
        log.info("BODY:\n{}", body);
        log.info("====================================");

        if (fromEmail != null && !fromEmail.isBlank()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                log.info("Email sent successfully to {}", toEmail);
            } catch (Exception e) {
                log.error("Failed to send real SMTP email to {}: {}", toEmail, e.getMessage());
            }
        } else {
            log.info("No SMTP username configured; logged OTP to console for local demo.");
        }
    }
}
