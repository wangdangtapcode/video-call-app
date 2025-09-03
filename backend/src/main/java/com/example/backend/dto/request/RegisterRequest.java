package com.example.backend.dto.request;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String passwordConfirm;
    private String fullName;
}
