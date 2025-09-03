package com.example.backend.websocket;

import com.example.backend.enums.UserStatus;
import com.example.backend.service.SupportRequestService;
import com.example.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * WebSocketPresenceHandler xử lý các sự kiện kết nối và ngắt kết nối WebSocket
 * để quản lý trạng thái online/offline của agents
 */
@Component
public class WebSocketPresenceHandler {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketPresenceHandler.class);
    private static final long OFFLINE_DELAY_SECONDS = 1; // Có thể set = 0 nếu muốn offline ngay

    @Autowired
    private UserService userService;

    @Autowired
    private TaskScheduler taskScheduler;

    @Autowired
    private SupportRequestService supportRequestService;
    // Chỉ cần track user nào đang online, không cần đếm session
    private final ConcurrentHashMap<Long, String> onlineUsers = new ConcurrentHashMap<>();

    // Map để track các tác vụ offline đã được lên lịch
    private final ConcurrentHashMap<Long, ScheduledFuture<?>> scheduledOfflineTasks = new ConcurrentHashMap<>();

    /**
     * Xử lý sự kiện khi WebSocket session được kết nối
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            String sessionId = headerAccessor.getSessionId();

            logger.info("🔌 STOMP CONNECT event - Session: {}", sessionId);

            Long userId = getUserIdFromSession(headerAccessor);
            logger.info("👤 Extracted userId from session: {}", userId);

            if (userId == null) {
                logger.warn("⏰ UserId is null, scheduling retry in 100ms for session: {}", sessionId);
                taskScheduler.schedule(() -> {
                    try {
                        Long retryUserId = getUserIdFromSession(headerAccessor);
                        if (retryUserId != null) {
                            logger.info("✅ Retry successful - Found userId: {} for session: {}", retryUserId,
                                    sessionId);
                            handleUserConnection(retryUserId, sessionId);
                        } else {
                            logger.warn("❌ Retry failed - Still no userId for session: {}", sessionId);
                        }
                    } catch (Exception e) {
                        logger.error("Error in retry for session: {}", sessionId, e);
                    }
                }, Instant.now().plusMillis(100));
                return;
            }

            handleUserConnection(userId, sessionId);
        } catch (Exception e) {
            logger.error("Error handling WebSocket connect event", e);
        }
    }

    private void handleUserConnection(Long userId, String sessionId) {
        try {
            // Hủy task offline nếu có (trường hợp reconnect)
            cancelOfflineTask(userId);

            // Track user và session
            onlineUsers.put(userId, sessionId);

            // Set status thành ONLINE
            userService.updateUserStatus(userId, UserStatus.ONLINE);
            logger.info("🟢 User {} is now ONLINE - Session: {}", userId, sessionId);

        } catch (Exception e) {
            logger.error("Error handling user connection for userId: {}", userId, e);
        }
    }

    /**
     * Xử lý sự kiện khi WebSocket session bị ngắt kết nối
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            String sessionId = headerAccessor.getSessionId();
            Object closeStatusObj = event.getMessage().getHeaders().get("simpSessionCloseStatus");
            String closeStatus = closeStatusObj != null ? closeStatusObj.toString() : "NORMAL";

            logger.info("🔌 STOMP DISCONNECT event - Session: {}, Close status: {}", sessionId, closeStatus);

            Long userId = getUserIdFromSession(headerAccessor);
            logger.info("👤 Extracted userId from disconnect session: {}", userId);

            if (userId != null) {
                // Remove user khỏi danh sách online
                onlineUsers.remove(userId);

                // Schedule offline task (hoặc set offline ngay nếu OFFLINE_DELAY_SECONDS = 0)
                if (OFFLINE_DELAY_SECONDS == 0) {

                    userService.updateUserStatus(userId, UserStatus.OFFLINE);
                    logger.info("🔴 User {} set to OFFLINE immediately", userId);
                } else {
                    scheduleOfflineTask(userId);
                    logger.info("🔴 User {} disconnected - Scheduling offline task in {} seconds",
                            userId, OFFLINE_DELAY_SECONDS);
                }
            }
        } catch (Exception e) {
            logger.error("Error handling WebSocket disconnect event", e);
        }
    }

    /**
     * Lên lịch tác vụ set user thành OFFLINE sau delay
     */
    private void scheduleOfflineTask(Long userId) {
        // Hủy tác vụ offline cũ nếu có
        cancelOfflineTask(userId);

        // Lên lịch tác vụ mới
        ScheduledFuture<?> future = taskScheduler.schedule(() -> {
            try {
                // Kiểm tra lại xem user có kết nối lại không
                if (!onlineUsers.containsKey(userId)) {
                    supportRequestService.removeUserHashtags(userId);
                    userService.updateUserStatus(userId, UserStatus.OFFLINE);
                    logger.info("🔴 User {} set to OFFLINE after disconnect timeout", userId);
                }
                // Clean up
                scheduledOfflineTasks.remove(userId);
            } catch (Exception e) {
                logger.error("Error executing offline task for user {}", userId, e);
            }
        }, Instant.now().plusSeconds(OFFLINE_DELAY_SECONDS));

        scheduledOfflineTasks.put(userId, future);
    }

    /**
     * Hủy tác vụ offline đã được lên lịch
     */
    private void cancelOfflineTask(Long userId) {
        ScheduledFuture<?> future = scheduledOfflineTasks.remove(userId);
        if (future != null && !future.isDone()) {
            future.cancel(false);
            logger.debug("Cancelled offline task for user {}", userId);
        }
    }

    /**
     * Lấy user ID từ WebSocket session
     */
    private Long getUserIdFromSession(StompHeaderAccessor headerAccessor) {
        try {
            // Option 1: Từ session attributes
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            if (sessionAttributes != null) {
                Object userIdObj = sessionAttributes.get("userId");
                if (userIdObj != null) {
                    logger.debug("🔍 Found userId in session attributes: {}", userIdObj);
                    return Long.valueOf(userIdObj.toString());
                }
            }

            // Option 2: Từ native headers
            String userIdHeader = headerAccessor.getFirstNativeHeader("userId");
            if (userIdHeader != null) {
                logger.debug("🔍 Found userId in native headers: {}", userIdHeader);
                return Long.valueOf(userIdHeader);
            }

            // Option 3: Từ STOMP headers
            String userIdFromStomp = headerAccessor.getFirstNativeHeader("X-User-ID");
            if (userIdFromStomp != null) {
                logger.debug("🔍 Found userId in STOMP headers: {}", userIdFromStomp);
                return Long.valueOf(userIdFromStomp);
            }

            return null;
        } catch (Exception e) {
            logger.error("Error extracting user ID from session", e);
            return null;
        }
    }

    /**
     * Method để manually set user offline (được gọi từ logout)
     */
    public void setUserOffline(Long userId) {
        // Hủy tác vụ offline nếu có
        cancelOfflineTask(userId);

        // Remove user khỏi danh sách online
        onlineUsers.remove(userId);
        supportRequestService.removeUserHashtags(userId);
        // Set status thành OFFLINE ngay lập tức
        userService.updateUserStatus(userId, UserStatus.OFFLINE);

        logger.info("🔴 User {} manually set to OFFLINE", userId);
    }
}
