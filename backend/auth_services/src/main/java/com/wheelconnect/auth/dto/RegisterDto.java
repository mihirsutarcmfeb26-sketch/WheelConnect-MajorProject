package com.wheelconnect.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterDto {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Pattern(regexp = "^(?!\\d+$)[a-zA-Z][a-zA-Z\\s'\\-]*$",
             message = "Name must start with a letter and contain only letters, spaces, hyphens, or apostrophes")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;

    @Pattern(regexp = "^$|^\\+[1-9]\\d{6,14}$",
             message = "Phone must be in international format (e.g., +919876543210)")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()\\-_+=])[A-Za-z\\d@$!%*?&#^()\\-_+=]{8,}$",
             message = "Password must contain at least one uppercase, one lowercase, one digit, and one special character")
    private String password;

    private String role = "CUSTOMER";

    public RegisterDto() {}

    public RegisterDto(String name, String email, String phone, String password, String role) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.role = role;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
