# JWT Integration for Agent Presence System

## Tổng Quan

Hệ thống Agent Presence đã được cập nhật để sử dụng JWT (JSON Web Token) thay vì userId đơn thuần, tăng cường bảo mật và hiệu quả.

## Backend Changes

### 1. JWT Service (`JwtService.java`)

- **Generate Token**: Tạo JWT với userId, email, role
- **Validate Token**: Xác thực và extract thông tin từ token
- **Token Expiration**: 24 giờ (configurable)
- **Secret Key**: Configurable trong application.properties

### 2. Authentication Flow

```java
// Login Response bao gồm token
public class LoginResponse {
    private User user;
    private UserMetric userMetric;
    private String token; // New field
}

// JWT configuration
jwt.secret-key=mySecretKey...
jwt.expiration=86400000 // 24 hours
```

### 3. WebSocket Authentication

- **UserHandshakeInterceptor**: Extract token từ query params hoặc headers
- **Token Validation**: Verify token trước khi cho phép WebSocket connection
- **Session Attributes**: Lưu userId, username, role từ token

### 4. API Security

- **Logout Endpoint**: Sử dụng Authorization header với Bearer token
- **Agent Status APIs**: Require JWT token trong headers

## Frontend Changes

### 1. Token Storage

```javascript
// UserContext state
const initialState = {
  user: null,
  userMetric: null,
  token: null, // New field
  isLoading: true,
  isInitialized: false,
};
```

### 2. WebSocket Connection

```javascript
// Connect với JWT token thay vì userId
const connectionUrl = token
  ? `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}`
  : WEBSOCKET_URL;
```

### 3. API Calls

```javascript
// Logout với Authorization header
await axios.post(
  "/api/auth/logout",
  {},
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

// Agent status update với token
await axios.put(`/api/agents/${userId}/status`, null, {
  params: { status: newStatus },
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Security Benefits

### 1. **Stateless Authentication**

- Server không cần lưu session state
- Token chứa tất cả thông tin cần thiết
- Scalable across multiple server instances

### 2. **Token Expiration**

- Automatic logout sau 24 giờ
- Prevent long-term token abuse
- Force re-authentication periodically

### 3. **Role-based Authorization**

- Token chứa user role information
- Server có thể verify permissions từ token
- No additional database lookup needed

### 4. **Secure Transmission**

- Token transmitted via secure headers
- Protected against CSRF attacks
- URL encoding for WebSocket query params

## Migration Flow

### Backend

1. ✅ Added JWT dependencies (jjwt-api, jjwt-impl, jjwt-jackson)
2. ✅ Created JwtService with token generation/validation
3. ✅ Updated AuthService to generate tokens on login
4. ✅ Modified LoginResponse to include token
5. ✅ Updated WebSocket interceptor for token authentication
6. ✅ Modified logout endpoint to use JWT token
7. ✅ Removed test/demo controllers

### Frontend

1. ✅ Updated UserContext to store and manage token
2. ✅ Modified WebSocket connection to use token
3. ✅ Updated login flow to handle token from response
4. ✅ Modified logout to send Authorization header
5. ✅ Updated useAgentPresence to use token in API calls
6. ✅ Removed demo/test pages

## Usage Examples

### Login Flow

```javascript
// Frontend login
const response = await axios.post("/api/auth/login", { email, password });
const { user, userMetric, token } = response.data;

// Store in context
login({ user, userMetric, token });

// Connect WebSocket với token
if (user.role.name === "AGENT") {
  connect(token);
}
```

### WebSocket Connection

```javascript
// Backend interceptor extracts từ query params
ws://localhost:8081/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Hoặc từ Authorization header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Agent Status Update

```javascript
// Frontend
const success = await updateAgentStatus("ONLINE");

// Backend validates token và updates status
// Broadcasts change qua WebSocket
```

## Configuration

### Backend (`application.properties`)

```properties
# JWT Configuration
jwt.secret-key=mySecretKeyForJWTTokenGenerationThatMustBeAtLeast256BitsLongForSecurityPurposes
jwt.expiration=86400000
```

### Frontend

- Token tự động saved trong localStorage
- Auto-reconnect WebSocket với stored token
- Automatic logout khi token expired (handled by backend)

## Error Handling

### Token Expiration

- Backend: Returns 401 Unauthorized
- Frontend: Automatic redirect to login
- WebSocket: Graceful disconnection

### Invalid Token

- Backend: Logs warning, continues without authentication
- Frontend: Fallback to non-authenticated state
- UI: Shows appropriate error messages

## Testing

### Manual Testing

1. **Login**: Verify token được generated và stored
2. **WebSocket**: Check connection works với token
3. **Status Update**: Test agent status changes
4. **Logout**: Verify token được cleared
5. **Expiration**: Test token expiration handling

### Token Validation

```bash
# Decode JWT token để verify contents
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 --decode
```

## Production Considerations

### Security

- Use strong, randomly generated secret key
- Consider shorter token expiration for high-security environments
- Implement token refresh mechanism if needed
- Use HTTPS in production

### Performance

- JWT validation is stateless và fast
- No database lookup for each request
- Efficient WebSocket authentication
- Reduced server memory usage

### Monitoring

- Log token generation/validation events
- Monitor token expiration patterns
- Track authentication failures
- Alert on suspicious token activities
