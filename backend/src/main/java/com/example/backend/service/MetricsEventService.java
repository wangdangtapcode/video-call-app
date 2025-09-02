package com.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service để handle các events và tự động cập nhật metrics
 */
@Service
public class MetricsEventService {

    @Autowired
    private UserMetricsService userMetricsService;

    /**
     * Handle khi user join video call session
     */
    public void handleUserJoinedCall(Long agentId, Long userId, String sessionId) {
        // Log event cho debugging
        System.out.println("User " + userId + " joined call with agent " + agentId + " in session " + sessionId);

        // Có thể thêm logic cập nhật metrics nếu cần
        // userMetricsService.updateCallActive(agentId, userId);
    }

    /**
     * Handle khi user rời khỏi video call session
     */
//    public void handleUserLeftCall(Long agentId, Long userId, String sessionId, Long durationSeconds) {
//        System.out.println("User " + userId + " left call with agent " + agentId +
//                " in session " + sessionId + " after " + durationSeconds + " seconds");
//
//        // Cập nhật metrics khi user rời khỏi call
//        if (durationSeconds != null && durationSeconds > 0) {
//            userMetricsService.updateCallCompleted(agentId, userId, durationSeconds, true);
//        }
//    }

    /**
     * Handle khi agent phản hồi support request
     */
//    public void handleAgentResponse(Long agentId, Long userId, LocalDateTime requestTime,
//            LocalDateTime responseTime, boolean isAccepted) {
//
//        if (requestTime != null && responseTime != null) {
//            long responseTimeSeconds = java.time.Duration.between(requestTime, responseTime).toSeconds();
//            userMetricsService.updateResponseTime(agentId, responseTimeSeconds);
//        }
//
//        System.out.println("Agent " + agentId + " responded to user " + userId +
//                " request: " + (isAccepted ? "ACCEPTED" : "REJECTED"));
//    }

    /**
     * Handle khi session timeout hoặc failed
     */
//    public void handleSessionFailed(Long agentId, Long userId, String reason) {
//        System.out.println("Session failed between agent " + agentId + " and user " + userId +
//                ". Reason: " + reason);
//
//        // Cập nhật failed call metrics
//        userMetricsService.updateCallCompleted(agentId, userId, 0L, false);
//    }

    /**
     * Handle batch metrics update (có thể chạy theo schedule)
     */
    public void handleBatchMetricsUpdate() {
        // Logic để cập nhật metrics theo batch nếu cần
        System.out.println("Running batch metrics update at " + LocalDateTime.now());
    }
}

