package com.wheelconnect.communication.controller;

import com.wheelconnect.communication.dto.CreateNotificationDto;
import com.wheelconnect.communication.entity.Notification;
import com.wheelconnect.communication.exception.ResourceNotFoundException;
import com.wheelconnect.communication.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getMyUnreadNotifications() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForUser(userId));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read."));
    }

    // Inter-service endpoint for creating system/charge notifications
    @PostMapping("/internal")
    public ResponseEntity<Notification> createNotification(@Valid @RequestBody CreateNotificationDto dto) {
        Notification n = new Notification();
        n.setUserId(dto.getUserId());
        n.setBookingId(dto.getBookingId());
        n.setTitle(dto.getTitle());
        n.setMessage(dto.getMessage());

        Notification created = notificationService.createNotification(n);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
