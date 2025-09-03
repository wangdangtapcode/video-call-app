package com.example.backend.controller;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.model.User;
import com.example.backend.service.AuthService;
import com.example.backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthService authService;

    @Autowired
    JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        LoginResponse loginResponse = authService.login(loginRequest.getEmail(), loginRequest.getPassword());
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = jwtService.extractTokenFromHeader(authHeader);

            authService.logout(token);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Logout successful");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Logout failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/oauth2/login")
    public ResponseEntity<?> oauth2Login(@RequestBody Map<String, String> requestBody) {
        String code = requestBody.get("code");
        LoginResponse loginResponse = authService.oauth2Login(code);
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        System.out.println("Register request: " + registerRequest);

        if (registerRequest.getPassword() == null || registerRequest.getPasswordConfirm() == null) {
            return ResponseEntity.badRequest().body("Password and password confirm are required");
        }
        if (!registerRequest.getPassword().equals(registerRequest.getPasswordConfirm())) {
            return ResponseEntity.badRequest().body("Password and password confirm do not match");
        }

        User registerResponse = authService.register(registerRequest.getEmail(), registerRequest.getPassword(), registerRequest.getFullName());
        return ResponseEntity.ok(registerResponse);
    }
}
