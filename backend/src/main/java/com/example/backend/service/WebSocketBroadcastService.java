package com.example.backend.service;

import com.example.backend.enums.UserStatus;
import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class WebSocketBroadcastService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void notifyRequestMatched(SupportRequest request) {
        // Notify user
        this.broadcastToUser(
                request.getUser().getId(),
                "request_matched",
                "Đã tìm thấy agent! Agent " + request.getAgent().getFullName() + " sẽ hỗ trợ bạn.",
                request);

        // Notify agent
        this.broadcastToUser(
                request.getAgent().getId(),
                "request_assigned",
                "Bạn đã được phân công hỗ trợ user " + request.getUser().getFullName(),
                request);

        System.out.println("Notified user " + request.getUser().getId() + " and agent "
                + request.getAgent().getId()
                + " about match");
    }

    public void notifyUserChooseAgent(SupportRequest request) {
        // Notify agent
        this.broadcastToUser(
                request.getAgent().getId(),
                "request_assigned",
                "Bạn nhận được yêu cầu hỗ trợ từ user " + request.getUser().getFullName(),
                request);

        System.out.println("Notified agent " + request.getAgent().getId() + " about match");
    }

    /**
     * Notify user khi request timeout
     */
    public void notifyRequestTimeout(SupportRequest request, String reason) {
        this.broadcastToUser(
                request.getUser().getId(),
                "request_timeout",
                reason,
                request);

        System.out.println("Notified user " + request.getUser().getId() + " about timeout: " + reason);

    }

    /**
     * Notify khi request completed
     */
    public void notifyRequestCompleted(SupportRequest request) {
        // Notify both user and agent
        this.broadcastToUser(
                request.getUser().getId(),
                "request_completed",
                "Yêu cầu hỗ trợ đã hoàn thành",
                request);

        if (request.getAgent() != null) {
            this.broadcastToUser(
                    request.getAgent().getId(),
                    "request_completed",
                    "Yêu cầu hỗ trợ đã hoàn thành",
                    request);
        }
    }

    /**
     * Notify user khi agent chấp nhận yêu cầu
     */
    public void notifyAgentAccepted(SupportRequest request) {
        this.broadcastToUser(
                request.getUser().getId(),
                "agent_accepted",
                "Agent " + request.getAgent().getFullName()
                        + " đã chấp nhận hỗ trợ bạn! Chuẩn bị kết nối video call...",
                request);

        System.out.println("Notified user " + request.getUser().getId() + " that agent accepted the request");
    }

    /**
     * Notify user khi agent từ chối yêu cầu
     */
    public void notifyAgentRejected(SupportRequest request) {
        String message = "Agent " + request.getAgent().getFullName() + " đã từ chối yêu cầu hỗ trợ.";

        this.broadcastToUser(
                request.getUser().getId(),
                "agent_rejected",
                message,
                request);

        System.out.println("Notified user " + request.getUser().getId() + " that agent rejected the request: ");
    }

    public void broadcastUserStatusChange(User user, UserStatus status) {
        Map<String, Object> message = new HashMap<>();
        message.put("userId", user.getId());
        message.put("fullName", user.getFullName());
        message.put("status", status);
        message.put("timestamp", System.currentTimeMillis());
        message.put("type", "USER_STATUS_CHANGE");

        messagingTemplate.convertAndSend("/topic/users/status-changes", message);
    }

    /**
     * Broadcast message to specific user
     */
    public void broadcastToUser(Long userId, String type, String message, SupportRequest request) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", type);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());

        if (request != null) {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("id", request.getId());
            requestData.put("status", request.getStatus());
            requestData.put("type", request.getType());
            requestData.put("createdAt", request.getCreatedAt());
            requestData.put("response", request.getResponse());
            if (request.getAgent() != null) {
                Map<String, Object> agentData = new HashMap<>();
                agentData.put("id", request.getAgent().getId());
                agentData.put("fullName", request.getAgent().getFullName());
                agentData.put("email", request.getAgent().getEmail());
                requestData.put("agent", agentData);
            }

            if (request.getUser() != null) {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", request.getUser().getId());
                userData.put("fullName", request.getUser().getFullName());
                userData.put("email", request.getUser().getEmail());
                requestData.put("user", userData);
            }

            notification.put("request", requestData);
        }

        // Send to user-specific topic
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/topic/support-updates",
                notification);
        messagingTemplate.convertAndSendToUser(
                "1",
                "/topic/support-updates",
                notification);

        System.out.println("notification: " + notification);
        System.out.println("Sent WebSocket message to user " + userId + ": " + type);
    }

    /**
     * Broadcast system-wide messages
     */
    public void broadcastSystemMessage(String message, String type) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", type);
        data.put("message", message);
        data.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend("/topic/system", data);
    }

    public void broadcastBlockUserMessage(Long id, String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "FORCE_LOGOUT");
        data.put("message", message);
        data.put("timestamp", System.currentTimeMillis());
        messagingTemplate.convertAndSend(
                "/topic/"+id+"/force-logout",      // queue dành riêng cho user đó
                data
        );
        System.out.println("Block user " + id);
    }

    /**
     * Broadcast notification (placeholder for compatibility)
     */
    public void notifyUserMatchingProgress(SupportRequest request, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "MATCHING_PROGRESS");
        notification.put("requestId", request.getId());
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSendToUser(
                request.getUser().getId().toString(),
                "/topic/support-updates",
                notification);
    }

    public void notifyUserMatched(SupportRequest request) {

        this.broadcastToUser(
                request.getUser().getId(),
                "request_matched",
                "Đã tìm thấy agent hỗ trợ! Đợi phản hồi",
                request);

    }

    public void notifyUserMatchingTimeout(SupportRequest request, String reason) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "request_timeout");
        notification.put("requestId", request.getId());
        notification.put("message", reason);
        notification.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSendToUser(
                request.getUser().getId().toString(),
                "/topic/support-updates",
                notification);
    }

    public void notifyUserRequestCancelled(SupportRequest request) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "REQUEST_CANCELLED");
        notification.put("requestId", request.getId());
        notification.put("message", "Yêu cầu hỗ trợ đã được hủy");
        notification.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSendToUser(
                request.getUser().getId().toString(),
                "/topic/support-updates",
                notification);
    }

    public void notifyUserMatchingError(SupportRequest request, String error) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "REQUEST_ERROR");
        notification.put("requestId", request.getId());
        notification.put("message", "Có lỗi xảy ra: " + error);
        notification.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSendToUser(
                request.getUser().getId().toString(),
                "/topic/support-updates",
                notification);
    }

    public void notifyAgentNewRequest(SupportRequest request) {

        this.broadcastToUser(
                request.getAgent().getId(),
                "request_assigned",
                "Bạn có yêu cầu hỗ trợ mới",
                request);

    }


}