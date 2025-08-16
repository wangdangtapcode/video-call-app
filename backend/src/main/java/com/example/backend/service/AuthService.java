package com.example.backend.service;

import com.example.backend.dto.response.LoginResponse;
import com.example.backend.enums.AgentStatus;
import com.example.backend.exception.AuthenticationException;
import com.example.backend.exception.ValidationException;
import com.example.backend.model.User;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserRepository;
import com.example.backend.websocket.WebSocketPresenceHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserMetricsService userMetricsService;

    @Autowired
    JwtService jwtService;

    @Autowired
    WebSocketPresenceHandler presenceHandler;

    public LoginResponse login(String email, String password) {
        // Validate input
        if (!StringUtils.hasText(email)) {
            throw ValidationException.emailRequired();
        }
        if (!StringUtils.hasText(password)) {
            throw ValidationException.passwordRequired();
        }

        User user = userRepository.findByEmailAndPassword(email, password)
                .orElseThrow(AuthenticationException::invalidCredentials);

        UserMetric userMetric = null;

        if ("AGENT".equalsIgnoreCase(user.getRole().getName())) {
            userMetric = userMetricsService.findByUserId(user.getId());

            if (userMetric != null) {
                userMetricsService.updateAgentStatus(user.getId(), AgentStatus.ONLINE);
            }
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().getName());

        return new LoginResponse(user, userMetric, token);
    }

    /**
     * Logout user và xử lý agent presence
     */
    public void logout(String token) {
        if (token == null || jwtService.isTokenExpired(token)) {
            throw new ValidationException("Invalid or expired token");
        }

        try {
            // Extract user info từ token
            Long userId = jwtService.extractUserId(token);
            String role = jwtService.extractRole(token);
            String email = jwtService.extractUsername(token);

            // Log logout event
            System.out.println("User logout: " + email + " (ID: " + userId + ", Role: " + role + ")");

            // Set agent status thành OFFLINE ngay lập tức (chỉ cho agents)
            if ("AGENT".equalsIgnoreCase(role)) {
                presenceHandler.setAgentOffline(userId);
                System.out.println("Agent " + userId + " set to OFFLINE");
            }

            // TODO: Có thể thêm logic khác như:
            // - Invalidate token (nếu có blacklist mechanism)
            // - Log audit trail
            // - Clean up user sessions
            // - Send notification

        } catch (Exception e) {
            throw new RuntimeException("Logout processing failed: " + e.getMessage(), e);
        }
    }

}
