package com.wheelconnect.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class EditProfileDto {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String address;

    private String currentPassword;
    private String newPassword;

    public EditProfileDto() {}

    public EditProfileDto(String name, String email, String phone, String address, String currentPassword, String newPassword) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
