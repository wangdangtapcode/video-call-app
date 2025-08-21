package com.example.backend.websocket;

import com.example.backend.enums.UserStatus;
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
    private static final long OFFLINE_DELAY_SECONDS = 15;

    @Autowired
    private UserService userService;

    @Autowired
    private TaskScheduler taskScheduler;

    // Map để track số lượng sessions của mỗi user
    private final ConcurrentHashMap<Long, Integer> userSessionCounts = new ConcurrentHashMap<>();

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
            String command = headerAccessor.getCommand() != null ? headerAccessor.getCommand().toString() : "N/A";

            logger.info("🔌 STOMP CONNECT event - Session: {}, Command: {}", sessionId, command);

            // Debug session attributes availability
            Map<String, Object> attributes = headerAccessor.getSessionAttributes();
            logger.debug("🔍 Session attributes available: {}, Count: {}",
                    attributes != null, attributes != null ? attributes.size() : 0);
            if (attributes != null && !attributes.isEmpty()) {
                logger.debug("🔍 Available keys: {}", attributes.keySet());
            }

            Long userId = getUserIdFromSession(headerAccessor);
            logger.info("👤 Extracted userId from session: {}", userId);

            // If userId is null, try again after a short delay (race condition fix)
            if (userId == null) {
                logger.warn("⏰ UserId is null, scheduling retry in 100ms for session: {}", sessionId);
                taskScheduler.schedule(() -> {
                    try {
                        Long retryUserId = getUserIdFromSession(headerAccessor);
                        if (retryUserId != null) {
                            logger.info("✅ Retry successful - Found userId: {} for session: {}", retryUserId,
                                    sessionId);
                            handleUserConnection(retryUserId);
                        } else {
                            logger.warn("❌ Retry failed - Still no userId for session: {}", sessionId);
                        }
                    } catch (Exception e) {
                        logger.error("Error in retry for session: {}", sessionId, e);
                    }
                }, Instant.now().plusMillis(100));
                return;
            }

            handleUserConnection(userId);
        } catch (Exception e) {
            logger.error("Error handling WebSocket connect event", e);
        }
    }

    private void handleUserConnection(Long userId) {
        try {
            userSessionCounts.merge(userId, 1, Integer::sum);
            int sessionCount = userSessionCounts.get(userId);

            cancelOfflineTask(userId);

            UserStatus currentStatus = userService.getUserStatus(userId);
            if (currentStatus == UserStatus.OFFLINE) {
                userService.updateUserStatus(userId, UserStatus.ONLINE);
                logger.info("🟢 Agent {} is now ONLINE (reconnected)", userId);
            } else {
                logger.info("🔄 Agent {} already ONLINE, session count: {}", userId, sessionCount);
            }

            logger.debug("📊 User {} connected - Active sessions: {}", userId, sessionCount);
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
                // Giảm số lượng sessions của user
                userSessionCounts.compute(userId, (key, count) -> {
                    if (count == null || count <= 1) {
                        return null; // Remove từ map nếu không còn session nào
                    }
                    return count - 1;
                });

                // Nếu đây là session cuối cùng của user, lên lịch tác vụ offline
                if (!userSessionCounts.containsKey(userId)) {
                    scheduleOfflineTask(userId);
                    logger.info("🔴 User {} fully disconnected - Scheduling offline task in {} seconds",
                            userId, OFFLINE_DELAY_SECONDS);
                } else {
                    int remainingSessions = userSessionCounts.get(userId);
                    logger.info("📊 User {} partially disconnected - Remaining sessions: {}",
                            userId, remainingSessions);
                }
            }
        } catch (Exception e) {
            logger.error("Error handling WebSocket disconnect event", e);
        }
    }

    /**
     * Lên lịch tác vụ set agent thành OFFLINE sau delay
     */
    private void scheduleOfflineTask(Long userId) {
        // Hủy tác vụ offline cũ nếu có
        cancelOfflineTask(userId);

        // Lên lịch tác vụ mới
        ScheduledFuture<?> future = taskScheduler.schedule(() -> {
            try {
                // Kiểm tra lại xem user có kết nối lại không
                if (!userSessionCounts.containsKey(userId)) {
                    userService.updateUserStatus(userId, UserStatus.OFFLINE);
                    logger.info("Agent {} set to OFFLINE after disconnect timeout", userId);
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
     * Cần customize method này dựa trên cách authentication được implement
     */
    private Long getUserIdFromSession(StompHeaderAccessor headerAccessor) {
        try {
            // Option 1: Từ session attributes (check null first)
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            if (sessionAttributes != null) {
                Object userIdObj = sessionAttributes.get("userId");
                if (userIdObj != null) {
                    logger.debug("🔍 Found userId in session attributes: {}", userIdObj);
                    return Long.valueOf(userIdObj.toString());
                }
            } else {
                logger.debug("⚠️ Session attributes is null for session: {}", headerAccessor.getSessionId());
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

            logger.debug("❌ No userId found in any location for session: {}", headerAccessor.getSessionId());
            return null;
        } catch (Exception e) {
            logger.error("💥 Error extracting user ID from session: {}", headerAccessor.getSessionId(), e);
            return null;
        }
    }

    /**
     * Method để manually set agent offline (được gọi từ logout)
     */
    public void setUserOffline(Long userId) {
        // Hủy tác vụ offline nếu có
        cancelOfflineTask(userId);

        // Remove tất cả sessions của user
        userSessionCounts.remove(userId);

        // Set status thành OFFLINE ngay lập tức
        userService.updateUserStatus(userId, UserStatus.OFFLINE);

        logger.info("Agent {} manually set to OFFLINE", userId);
    }
}
