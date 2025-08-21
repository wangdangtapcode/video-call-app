package com.example.backend.service;

import com.example.backend.dto.response.LoginResponse;
import com.example.backend.enums.UserStatus;
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
    JwtService jwtService;

    @Autowired
    WebSocketPresenceHandler presenceHandler;

    @Autowired
    UserService userService;

    @Autowired
    UserMetricsService userMetricsService;

    public LoginResponse login(String email, String password) {
        if (!StringUtils.hasText(email)) {
            throw ValidationException.emailRequired();
        }
        if (!StringUtils.hasText(password)) {
            throw ValidationException.passwordRequired();
        }

        User user = userRepository.findByEmailAndPasswordAndIsActive(email, password, true)
                .orElseThrow(AuthenticationException::invalidCredentials);

        UserMetric userMetric = null;

        userService.updateUserStatus(user.getId(), UserStatus.ONLINE);

        if ("AGENT".equalsIgnoreCase(user.getRole())) {
            userMetric = userMetricsService.findByUserId(user.getId());
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

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
            Long userId = jwtService.extractUserId(token);
            String role = jwtService.extractRole(token);
            String email = jwtService.extractUsername(token);

            System.out.println("User logout: " + email + " (ID: " + userId + ", Role: " + role + ")");

            presenceHandler.setUserOffline(userId);
            System.out.println("User " + userId + " set to OFFLINE");

        } catch (Exception e) {
            throw new RuntimeException("Logout processing failed: " + e.getMessage(), e);
        }
    }

}
