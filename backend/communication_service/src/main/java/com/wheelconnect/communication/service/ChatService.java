package com.wheelconnect.communication.service;

import com.wheelconnect.communication.entity.ChatMessage;

import java.util.List;

public interface ChatService {

    ChatMessage sendMessage(ChatMessage message);

    List<ChatMessage> getMessagesByBookingId(Long bookingId);

    void markMessagesAsRead(Long bookingId, Long currentUserId);
}
