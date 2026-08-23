package com.wheelconnect.communication.service;

import com.wheelconnect.communication.entity.ChatMessage;
import com.wheelconnect.communication.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatRepository;

    public ChatServiceImpl(ChatMessageRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    @Override
    public ChatMessage sendMessage(ChatMessage message) {
        if (message.getMessage() == null || message.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Chat message content cannot be empty or blank.");
        }
        message.setMessage(message.getMessage().trim());
        message.setSentAt(LocalDateTime.now());
        message.setIsRead(false);
        return chatRepository.save(message);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessage> getMessagesByBookingId(Long bookingId) {
        return chatRepository.findByBookingIdOrderBySentAtAsc(bookingId);
    }

    @Override
    public void markMessagesAsRead(Long bookingId, Long currentUserId) {
        List<ChatMessage> list = chatRepository.findByBookingIdOrderBySentAtAsc(bookingId);
        for (ChatMessage msg : list) {
            if (!currentUserId.equals(msg.getSenderUserId()) && !Boolean.TRUE.equals(msg.getIsRead())) {
                msg.setIsRead(true);
                chatRepository.save(msg);
            }
        }
    }
}
