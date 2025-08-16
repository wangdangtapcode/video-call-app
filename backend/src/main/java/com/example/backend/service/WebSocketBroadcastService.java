package com.example.backend.service;

import com.example.backend.enums.AgentStatus;
import com.example.backend.model.SupportRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class WebSocketBroadcastService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast agent status change
     */
    public void broadcastAgentStatusChange(Long userId, AgentStatus status) {
        Map<String, Object> message = new HashMap<>();
        message.put("userId", userId);
        message.put("status", status);
        message.put("timestamp", System.currentTimeMillis());
        message.put("type", "AGENT_STATUS_CHANGE");

        messagingTemplate.convertAndSend("/topic/agents/status-changes", message);
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

    /**
     * Broadcast notification (placeholder for compatibility)
     */
    public void broadcastNotification(Object notification) {
        // This method exists for compatibility with existing code
        System.out.println("Broadcasting notification: " + notification);
    }
}