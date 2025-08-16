# Logout Service Refactor

## Tổng Quan

Đã refactor logout logic từ AuthController sang AuthService để tuân thủ Service Layer Pattern và tách biệt concerns.

## Thay Đổi Được Thực Hiện

### 1. AuthService.java - Thêm Logout Method

```java
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
```

#### Dependencies Được Thêm:

- `WebSocketPresenceHandler presenceHandler` - Để handle agent offline

### 2. AuthController.java - Simplified Logout

```java
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
    try {
        // Extract token từ Authorization header
        String token = jwtService.extractTokenFromHeader(authHeader);

        // Delegate logout logic to AuthService
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
```

#### Removed Dependencies:

- `WebSocketPresenceHandler` - Không cần nữa vì logic đã move sang service

## Benefits Của Refactor

### 1. **Separation of Concerns**

- **Controller**: Chỉ handle HTTP requests/responses
- **Service**: Chứa business logic cho authentication

### 2. **Code Reusability**

- Logout logic có thể được reuse từ các controllers khác
- Service method có thể được gọi từ scheduled jobs, admin endpoints, etc.

### 3. **Better Testing**

- Service logic có thể được unit test độc lập
- Controller testing chỉ cần mock service calls

### 4. **Maintainability**

- Business logic tập trung ở một nơi
- Dễ dàng thêm/sửa logout logic without touching controller

### 5. **Transaction Management**

- Service methods có thể easily được wrap trong transactions
- Better error handling và rollback capabilities

## Usage Examples

### From Controller

```java
// Current usage
authService.logout(token);
```

### From Scheduled Task

```java
@Scheduled(fixedRate = 3600000) // Every hour
public void cleanupExpiredSessions() {
    // Get expired tokens from some store
    List<String> expiredTokens = getExpiredTokens();

    for (String token : expiredTokens) {
        try {
            authService.logout(token);
        } catch (Exception e) {
            log.error("Failed to logout expired token", e);
        }
    }
}
```

### From Admin Endpoint

```java
@PostMapping("/admin/force-logout/{userId}")
public ResponseEntity<?> forceLogout(@PathVariable Long userId) {
    // Find user's active token
    String token = findActiveTokenForUser(userId);

    if (token != null) {
        authService.logout(token);
        return ResponseEntity.ok("User logged out successfully");
    }

    return ResponseEntity.notFound().build();
}
```

## Future Enhancements

### 1. **Token Blacklisting**

```java
// Trong logout method
tokenBlacklistService.addToBlacklist(token);
```

### 2. **Audit Logging**

```java
auditService.logLogoutEvent(userId, email, role, timestamp);
```

### 3. **Session Cleanup**

```java
sessionService.invalidateAllUserSessions(userId);
```

### 4. **Notification Service**

```java
if ("AGENT".equalsIgnoreCase(role)) {
    notificationService.notifyAgentOffline(userId);
}
```

### 5. **Metrics Collection**

```java
metricsService.incrementLogoutCounter(role);
metricsService.recordSessionDuration(userId, sessionStartTime);
```

## Error Handling

### Service Layer Exceptions

- `ValidationException` - For invalid/expired tokens
- `RuntimeException` - For processing failures

### Controller Layer

- Catches all exceptions from service
- Returns appropriate HTTP status codes
- Provides user-friendly error messages

## Testing Strategy

### Unit Tests for AuthService.logout()

```java
@Test
void logout_WithValidAgentToken_ShouldSetAgentOffline() {
    // Given
    String token = "valid.agent.token";
    when(jwtService.isTokenExpired(token)).thenReturn(false);
    when(jwtService.extractUserId(token)).thenReturn(1L);
    when(jwtService.extractRole(token)).thenReturn("AGENT");

    // When
    authService.logout(token);

    // Then
    verify(presenceHandler).setAgentOffline(1L);
}
```

### Integration Tests for AuthController

```java
@Test
void logout_WithValidToken_ShouldReturnSuccess() throws Exception {
    mockMvc.perform(post("/api/auth/logout")
            .header("Authorization", "Bearer valid.token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Logout successful"));
}
```

## Migration Notes

- ✅ No breaking changes cho frontend
- ✅ API endpoint remains the same
- ✅ Response format unchanged
- ✅ Error handling improved
- ✅ Code organization improved
