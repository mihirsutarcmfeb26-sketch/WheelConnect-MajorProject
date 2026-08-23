package com.wheelconnect.communication.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateNotificationDto {

    @NotNull(message = "User ID is required")
    private Long userId;

    private Long bookingId;

    @NotBlank(message = "Title is required")
    @Size(max = 150)
    private String title;

    @NotBlank(message = "Message is required")
    @Size(max = 500)
    private String message;

    public CreateNotificationDto() {}

    public CreateNotificationDto(Long userId, Long bookingId, String title, String message) {
        this.userId = userId;
        this.bookingId = bookingId;
        this.title = title;
        this.message = message;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
