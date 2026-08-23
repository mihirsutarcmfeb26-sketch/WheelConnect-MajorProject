package com.wheelconnect.communication.controller;

import com.wheelconnect.communication.dto.SendMessageDto;
import com.wheelconnect.communication.entity.ChatMessage;
import com.wheelconnect.communication.exception.ResourceNotFoundException;
import com.wheelconnect.communication.security.JwtTokenProvider;
import com.wheelconnect.communication.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final JwtTokenProvider jwtTokenProvider;

    public ChatController(ChatService chatService, JwtTokenProvider jwtTokenProvider) {
        this.chatService = chatService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return (Long) auth.getCredentials();
    }

    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@Valid @RequestBody SendMessageDto dto, HttpServletRequest request) {
        Long userId = getCurrentUserId();
        String token = request.getHeader("Authorization").substring(7);

        ChatMessage msg = new ChatMessage();
        msg.setBookingId(dto.getBookingId());
        msg.setSenderUserId(userId);
        msg.setSenderRole(jwtTokenProvider.getRoleFromToken(token));
        msg.setSenderName(jwtTokenProvider.getEmailFromToken(token));
        msg.setMessage(dto.getMessage());

        ChatMessage sent = chatService.sendMessage(msg);
        return ResponseEntity.status(HttpStatus.CREATED).body(sent);
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<ChatMessage>> getMessagesForBooking(@PathVariable Long bookingId) {
        Long userId = getCurrentUserId();
        chatService.markMessagesAsRead(bookingId, userId);
        List<ChatMessage> messages = chatService.getMessagesByBookingId(bookingId);
        return ResponseEntity.ok(messages);
    }
}
