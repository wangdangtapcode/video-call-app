package com.example.backend.controller;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.model.User;
import com.example.backend.service.AuthService;
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        LoginResponse loginResponse = authService.login(loginRequest.getEmail(), loginRequest.getPassword());
        return ResponseEntity.ok(loginResponse);
    }


}
