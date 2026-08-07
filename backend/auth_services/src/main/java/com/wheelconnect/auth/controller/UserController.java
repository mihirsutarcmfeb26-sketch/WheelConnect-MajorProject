package com.wheelconnect.auth.controller;

import com.wheelconnect.auth.dto.EditProfileDto;
import com.wheelconnect.auth.dto.UserResponseDto;
import com.wheelconnect.auth.entity.User;
import com.wheelconnect.auth.exception.ResourceNotFoundException;
import com.wheelconnect.auth.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        return userService.getUserByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserResponseDto toResponseDto(User user) {
        if (user == null) return null;
        return new UserResponseDto(
                user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getPhone(), user.getAddress(), user.getIsActive(), user.getServiceCenterId()
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        User user = getCurrentUser();
        return ResponseEntity.ok(toResponseDto(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody EditProfileDto dto) {
        User user = getCurrentUser();

        if (!user.getEmail().equalsIgnoreCase(dto.getEmail()) && userService.emailExists(dto.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email is already registered."));
        }

        if (dto.getCurrentPassword() != null && !dto.getCurrentPassword().isBlank()
                && dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Current password is incorrect."));
            }
            user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        }

        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getAddress() != null) user.setAddress(dto.getAddress());

        userService.updateUser(user);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully!"));
    }

    // --- Inter-service Internal REST Endpoints ---

    @GetMapping("/internal/{id}")
    public ResponseEntity<UserResponseDto> getInternalUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(u -> ResponseEntity.ok(toResponseDto(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/internal/by-email/{email}")
    public ResponseEntity<UserResponseDto> getInternalUserByEmail(@PathVariable String email) {
        return userService.getUserByEmail(email)
                .map(u -> ResponseEntity.ok(toResponseDto(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/internal/mechanics/{serviceCenterId}")
    public ResponseEntity<List<UserResponseDto>> getInternalMechanicsByServiceCenter(@PathVariable Long serviceCenterId) {
        List<UserResponseDto> list = userService.getMechanicsByServiceCenterId(serviceCenterId).stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/internal/by-role/{role}")
    public ResponseEntity<List<UserResponseDto>> getInternalUsersByRole(@PathVariable String role) {
        List<UserResponseDto> list = userService.getUsersByRole(role).stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PutMapping("/internal/{id}/promote-service-center")
    public ResponseEntity<UserResponseDto> promoteToServiceCenter(
            @PathVariable Long id,
            @RequestParam(required = false) Long serviceCenterId) {
        Optional<User> uOpt = userService.getUserById(id);
        if (uOpt.isEmpty()) return ResponseEntity.notFound().build();
        User user = uOpt.get();
        user.setRole("SERVICE_CENTER");
        if (serviceCenterId != null) {
            user.setServiceCenterId(serviceCenterId);
        }
        user.setIsActive(true);
        userService.updateUser(user);
        return ResponseEntity.ok(toResponseDto(user));
    }

    // --- Admin & Service Center Operations ---

    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllUsers(@RequestParam(required = false) String role) {
        List<User> users = (role != null && !role.isBlank()) ?
                userService.getUsersByRole(role) : userService.getAllUsers();
        return ResponseEntity.ok(users.stream().map(this::toResponseDto).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userService.emailExists(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Email already registered."));
        }
        User created = userService.registerUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponseDto(created));
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long id) {
        Optional<User> uOpt = userService.getUserById(id);
        if (uOpt.isEmpty()) return ResponseEntity.notFound().build();
        User u = uOpt.get();
        u.setIsActive(!Boolean.TRUE.equals(u.getIsActive()));
        userService.updateUser(u);
        return ResponseEntity.ok(Map.of("message", "User status toggled successfully."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        boolean deleted = userService.deleteUser(id);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "User deleted successfully."));
    }
}
