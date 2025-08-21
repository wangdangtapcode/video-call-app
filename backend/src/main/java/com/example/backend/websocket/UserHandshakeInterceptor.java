package com.example.backend.websocket;

import com.example.backend.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;


@Component
public class UserHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(UserHandshakeInterceptor.class);

    @Autowired
    private JwtService jwtService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        try {
            String token = null;
            String clientProtocol = request.getHeaders().getFirst("Sec-WebSocket-Protocol");
            logger.info("🔗 WebSocket handshake started - Protocol: {}, URI: {}",
                    clientProtocol, request.getURI());

            String query = request.getURI().getQuery();
            if (query != null) {
                String[] params = query.split("&");
                for (String param : params) {
                    String[] keyValue = param.split("=", 2);
                    if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                        try {
                            token = java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                            logger.debug("✅ JWT token extracted from URL query params");
                        } catch (Exception e) {
                            logger.error("❌ Error decoding token from URL", e);
                            token = keyValue[1]; // Fallback to non-decoded
                        }
                        break;
                    }
                }
            }

            if (token == null) {
                String authHeader = request.getHeaders().getFirst("Authorization");
                token = jwtService.extractTokenFromHeader(authHeader);
                if (token != null) {
                    logger.debug("✅ JWT token extracted from Authorization header");
                }
            }

            if (token != null) {
                try {
                    if (!jwtService.isTokenExpired(token)) {
                        Long userId = jwtService.extractUserId(token);
                        String username = jwtService.extractUsername(token);
                        String role = jwtService.extractRole(token);

                        // Lưu thông tin user vào session attributes
                        attributes.put("userId", userId);
                        attributes.put("username", username);
                        attributes.put("role", role);
                        attributes.put("token", token);

                        logger.info("🎯 WebSocket authenticated - User: {} (ID: {}, Role: {})",
                                username, userId, role);

                        response.getHeaders().add("Access-Control-Allow-Credentials", "true");

                        return true;
                    } else {
                        logger.warn("⏰ WebSocket handshake: Token expired");
                    }
                } catch (Exception e) {
                    logger.error("❌ WebSocket handshake: Invalid token", e);
                }
            }

            logger.warn("⚠️ WebSocket handshake: No valid token found - allowing anonymous connection");
            return true;

        } catch (Exception e) {
            logger.error("💥 Error during WebSocket handshake", e);
            return true;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            logger.error("💥 WebSocket handshake failed with exception", exception);
        } else {
            logger.info("✅ WebSocket handshake completed successfully");
        }
    }
}
