package com.wheelconnect.booking.dto;

import jakarta.validation.constraints.NotBlank;

public class RespondChargeDto {

    @NotBlank(message = "Decision is required (APPROVED or REJECTED)")
    private String status; // APPROVED or REJECTED

    public RespondChargeDto() {}

    public RespondChargeDto(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
