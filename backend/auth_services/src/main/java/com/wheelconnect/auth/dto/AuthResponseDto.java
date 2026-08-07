package com.wheelconnect.auth.dto;

public class AuthResponseDto {

    private String token;
    private String tokenType = "Bearer";
    private Long id;
    private String name;
    private String email;
    private String role;
    private Boolean requiresOtp = false;
    private String message;

    public AuthResponseDto() {}

    public AuthResponseDto(String token, Long id, String name, String email, String role) {
        this.token = token;
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public static AuthResponseDto otpRequired(String message) {
        AuthResponseDto resp = new AuthResponseDto();
        resp.setRequiresOtp(true);
        resp.setMessage(message);
        return resp;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getRequiresOtp() { return requiresOtp; }
    public void setRequiresOtp(Boolean requiresOtp) { this.requiresOtp = requiresOtp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
