package com.wheelconnect.communication.service;

import com.wheelconnect.communication.entity.Notification;

import java.util.List;

public interface NotificationService {

    Notification createNotification(Notification notification);

    List<Notification> getNotificationsForUser(Long userId);

    List<Notification> getUnreadNotificationsForUser(Long userId);

    void markAsRead(Long notificationId, Long userId);
}
