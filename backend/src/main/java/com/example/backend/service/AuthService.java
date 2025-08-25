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

import java.util.Optional;

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

    @Autowired
    private CodeStoreService codeStoreService;

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

    public LoginResponse oauth2Login(String code) {
        System.out.println("Code: " + code);
        User user1 = codeStoreService.consumeCode(code);
        System.out.println("User1: " + user1);
        if (user1 == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        User user = userRepository.findByEmailAndIsActive(user1.getEmail(), true)
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
     * Tạo user mới từ thông tin OAuth2
     */
    public User createOAuth2User(String email, String fullName, String googleId, String avatarUrl) {
        // Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setGoogleId(googleId);
        newUser.setProvider("GOOGLE");
        newUser.setAvatarUrl(avatarUrl);
        newUser.setRole("USER"); // Mặc định là USER
        newUser.setActive(true);
        newUser.setStatus(UserStatus.OFFLINE);
        // Không cần password cho OAuth2 users
        newUser.setPassword(null);

        User savedUser = userRepository.save(newUser);
        System.out.println("Created new OAuth2 user: " + email + " with ID: " + savedUser.getId());

        return savedUser;
    }

    /**
     * Tìm hoặc tạo user từ OAuth2 info
     */
    public User findOrCreateOAuth2User(String email, String fullName, String googleId, String avatarUrl) {
        // Tìm theo email trước
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            System.out.println("Found existing user by email: " + email);

            // Cập nhật thông tin OAuth2 nếu chưa có
            boolean needUpdate = false;

            if (user.getGoogleId() == null || user.getGoogleId().isEmpty()) {
                user.setGoogleId(googleId);
                user.setProvider("GOOGLE");
                needUpdate = true;
            }

            if (avatarUrl != null && !avatarUrl.isEmpty() &&
                    (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty())) {
                user.setAvatarUrl(avatarUrl);
                needUpdate = true;
            }

            if (fullName != null && !fullName.isEmpty() &&
                    (user.getFullName() == null || user.getFullName().isEmpty())) {
                user.setFullName(fullName);
                needUpdate = true;
            }

            if (needUpdate) {
                user = userRepository.save(user);
                System.out.println("Updated existing user with OAuth2 info: " + email);
            }
            System.out.println("User findOrCreateOAuth2User: " + user);
            return user;
        }

        // Tìm theo Google ID
        Optional<User> googleUser = userRepository.findByGoogleId(googleId);
        if (googleUser.isPresent()) {
            System.out.println("Found existing user by Google ID: " + googleId);
            return googleUser.get();
        }

        // Tạo user mới (AUTO REGISTER)
        System.out.println("Auto-registering new OAuth2 user: " + email);
        return createOAuth2User(email, fullName, googleId, avatarUrl);
    }
}
