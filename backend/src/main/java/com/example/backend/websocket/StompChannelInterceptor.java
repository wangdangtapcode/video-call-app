package com.example.backend.websocket;

import com.example.backend.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Channel interceptor để process JWT token trong STOMP CONNECT và set session
 * attributes
 */
//@Component
//public class StompChannelInterceptor implements ChannelInterceptor {
//
//    private static final Logger logger = LoggerFactory.getLogger(StompChannelInterceptor.class);
//
//    @Autowired
//    private JwtService jwtService;
//
//    @Override
//    public Message<?> preSend(Message<?> message, MessageChannel channel) {
//        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
//
//        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
//            String sessionId = accessor.getSessionId();
//            logger.info("🔗 STOMP CONNECT intercepted - Session: {}", sessionId);
//
//            // Check for Authorization header in STOMP connect
//            String authHeader = accessor.getFirstNativeHeader("Authorization");
//            if (authHeader != null) {
//                logger.info("🔐 Found Authorization header in STOMP CONNECT");
//                try {
//                    String token = jwtService.extractTokenFromHeader(authHeader);
//                    if (token != null && !jwtService.isTokenExpired(token)) {
//                        Long userId = jwtService.extractUserId(token);
//                        String username = jwtService.extractUsername(token);
//                        String role = jwtService.extractRole(token);
//
//                        // Set session attributes
//                        accessor.getSessionAttributes().put("userId", userId);
//                        accessor.getSessionAttributes().put("username", username);
//                        accessor.getSessionAttributes().put("role", role);
//                        accessor.getSessionAttributes().put("token", token);
//
//                        logger.info("✅ JWT processed in STOMP - userId: {}, username: {}, role: {}", userId, username,
//                                role);
//                    }
//                } catch (Exception e) {
//                    logger.error("❌ Error processing JWT in STOMP CONNECT", e);
//                }
//            }
//
//            // Log existing session attributes
//            if (accessor.getSessionAttributes() != null) {
//                logger.info("📋 Session attributes available: {}", accessor.getSessionAttributes().keySet());
//
//                Object userId = accessor.getSessionAttributes().get("userId");
//                Object username = accessor.getSessionAttributes().get("username");
//                Object role = accessor.getSessionAttributes().get("role");
//
//                logger.info("🎯 Final session data - userId: {}, username: {}, role: {}", userId, username, role);
//            } else {
//                logger.warn("⚠️ No session attributes found in STOMP CONNECT");
//            }
//        }
//
//        return message;
//    }
//}
