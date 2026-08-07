package com.wheelconnect.auth.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wheelconnect.auth.dto.AuthResponseDto;
import com.wheelconnect.auth.dto.ForgotPasswordDto;
import com.wheelconnect.auth.dto.LoginDto;
import com.wheelconnect.auth.dto.RegisterDto;
import com.wheelconnect.auth.dto.ResendOtpDto;
import com.wheelconnect.auth.dto.ResetPasswordDto;
import com.wheelconnect.auth.dto.VerifyOtpDto;
import com.wheelconnect.auth.entity.User;
import com.wheelconnect.auth.security.JwtTokenProvider;
import com.wheelconnect.auth.service.OtpService;
import com.wheelconnect.auth.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final OtpService otpService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserService userService, OtpService otpService,
                          JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.otpService = otpService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterDto dto) {
        if (userService.emailExists(dto.getEmail())) {
            Optional<User> existingOpt = userService.getUserByEmail(dto.getEmail());
            if (existingOpt.isPresent() && !Boolean.TRUE.equals(existingOpt.get().getIsActive())) {
                User existing = existingOpt.get();
                existing.setName(dto.getName());
                existing.setPhone(dto.getPhone() != null ? dto.getPhone() : "");
                existing.setPassword(passwordEncoder.encode(dto.getPassword()));
                existing.setRole("CUSTOMER");
                userService.updateUser(existing);
                otpService.generateAndSendOtp(existing);
                return ResponseEntity.ok(Map.of(
                        "message", "An unverified account exists for this email. OTP sent for activation.",
                        "requiresOtp", true,
                        "email", existing.getEmail()
                ));
            }
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email is already registered."));
        }
        User newUser = new User();
        newUser.setName(dto.getName());
        newUser.setEmail(dto.getEmail());
        newUser.setPhone(dto.getPhone() != null ? dto.getPhone() : "");
        newUser.setPassword(dto.getPassword());
        newUser.setRole("CUSTOMER");
        newUser.setIsActive(false);

        User created = userService.registerUser(newUser);
        if (created == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Registration failed. Please try again."));
        }
        // Force isActive to false until registration OTP is verified
        created.setIsActive(false);
        userService.updateUser(created);

        // Generate and send OTP for Registration activation
        otpService.generateAndSendOtp(created);

        return ResponseEntity.ok(Map.of(
                "message", "Registration successful! Please verify the OTP sent to your email to activate your account.",
                "requiresOtp", true,
                "email", created.getEmail(),
                "userId", created.getId()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }
        User user = userOpt.get();

        // If user is registered but inactive, inform them to verify OTP - except for a
        // MECHANIC, who never goes through self-registration/OTP at all (their account is
        // created directly, already active, by their Service Center). For a mechanic,
        // isActive=false only ever means "deactivated by their Service Center" - routing
        // that into the OTP branch below would auto-email them an OTP that reactivates
        // their account on verification, silently undoing the deactivation.
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            if ("MECHANIC".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", "Your account has been deactivated by your Service Center. Please contact them for assistance."));
            }
            otpService.generateAndSendOtp(user);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Account is not activated. An activation OTP has been sent to your email.",
                    "requiresOtp", true,
                    "email", user.getEmail()
            ));
        }

        // Validate password
        Optional<User> authUserOpt = userService.loginUser(dto.getEmail(), dto.getPassword());
        if (authUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }

        String role = user.getRole() != null ? user.getRole().toUpperCase() : "CUSTOMER";

        // ADMIN and SUPER_ADMIN require OTP (2FA)
        if ("ADMIN".equals(role) || "SUPER_ADMIN".equals(role)) {
            otpService.generateAndSendOtp(user);
            return ResponseEntity.ok(AuthResponseDto.otpRequired(
                    "Admin OTP code sent to your email (" + user.getEmail() + "). Please verify to complete login."));
        }

        // CUSTOMER, MECHANIC, SERVICE_CENTER: Direct Login with JWT (NO OTP)
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return ResponseEntity.ok(new AuthResponseDto(token, user.getId(), user.getName(), user.getEmail(), user.getRole()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid authentication request."));
        }
        User user = userOpt.get();

        boolean isValid = otpService.verifyOtp(user, dto.getOtp());
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired OTP code."));
        }

        // Activate account if registration pending
        boolean wasInactive = !Boolean.TRUE.equals(user.getIsActive());
        if (wasInactive) {
            user.setIsActive(true);
            userService.updateUser(user);
        }

        // Generate JWT token upon successful OTP verification
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        AuthResponseDto response = new AuthResponseDto(token, user.getId(), user.getName(), user.getEmail(), user.getRole());
        if (wasInactive) {
            response.setMessage("Account activated successfully!");
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody ResendOtpDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "User not found."));
        }
        User user = userOpt.get();

        if (!otpService.canResendOtp(user)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Please wait 30 seconds before requesting a new OTP."));
        }

        otpService.generateAndSendOtp(user);
        return ResponseEntity.ok(Map.of("message", "A new OTP code has been sent to your email."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "User with this email address does not exist."));
        }
        User user = userOpt.get();

        if (!otpService.canResendOtp(user)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Please wait 30 seconds before requesting a new OTP."));
        }

        otpService.generateAndSendOtp(user);
        return ResponseEntity.ok(Map.of(
                "message", "Password reset OTP code sent to your email (" + user.getEmail() + ")."
        ));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyResetOtp(@Valid @RequestBody VerifyOtpDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "User with this email address does not exist."));
        }
        User user = userOpt.get();
        // Verify OTP validity
        boolean isValid = otpService.verifyOtp(user, dto.getOtp());
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired OTP code."));
        }
        return ResponseEntity.ok(Map.of(
                "message", "OTP verified successfully. Please enter your new password."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordDto dto) {
        Optional<User> userOpt = userService.getUserByEmail(dto.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "User with this email address does not exist."));
        }
        User user = userOpt.get();

        boolean isValid = otpService.verifyOtp(user, dto.getOtp());
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired OTP code."));
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userService.updateUser(user);

        return ResponseEntity.ok(Map.of(
                "message", "Password reset successful! You can now login with your new password."
        ));
    }
}
