package com.example.backend.controller;

import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import com.example.backend.service.SupportRequestService;
import com.example.backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    @Autowired
    private SupportRequestService supportRequestService;

    @Autowired
    private JwtService jwtService;

    @GetMapping("/requests/{requestId}")
    public ResponseEntity<?> getSupportRequest(@PathVariable Long requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return supportRequestService.getSupportRequest(requestId, authHeader);
    }

    @PostMapping("/requests")
    public ResponseEntity<?> createSupportRequest(
            @RequestBody Map<String, Object> requestBody,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Extract và validate JWT token
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid or expired token");
                return ResponseEntity.badRequest().body(response);
            }

            Long userId = jwtService.extractUserId(token);
            String userRole = jwtService.extractRole(token);

            // Validate user role (chỉ USER mới có thể tạo support request)
            if (!"USER".equalsIgnoreCase(userRole)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Only users can create support requests");
                return ResponseEntity.badRequest().body(response);
            }

            // Extract request data
            String type = (String) requestBody.get("type");
            Long agentId = requestBody.get("agentId") != null ? Long.valueOf(requestBody.get("agentId").toString())
                    : null;

            // Validate type
            if (!"quick_support".equals(type) && !"choose_agent".equals(type)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid support type. Must be 'quick_support' or 'choose_agent'");
                return ResponseEntity.badRequest().body(response);
            }

            // Validate cho choose_agent
            if ("choose_agent".equals(type) && agentId == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "agentId is required for choose_agent type");
                return ResponseEntity.badRequest().body(response);
            }

            // Tạo support request
            SupportRequest request = supportRequestService.createSupportRequest(userId, type, agentId);

            // Trả về response ngay lập tức
            Map<String, Object> response = new HashMap<>();
            response.put("id", request.getId()); // Thêm id để frontend có thể hủy
            response.put("requestId", request.getId());
            response.put("status", request.getStatus().toString());
            response.put("type", request.getType());
            response.put("estimatedWaitTime", supportRequestService.getEstimatedWaitTime(type, agentId)+"");
            response.put("message", getInitialMessage(type, agentId));
            response.put("timestamp", System.currentTimeMillis());
            response.put("maxWaitTime", getMaxWaitTime(type));

            // Trigger matching process bất đồng bộ
            supportRequestService.processMatching(request.getId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            e.printStackTrace();
            response.put("message", "Error creating support request: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/agents/online")
    public ResponseEntity<?> getOnlineAgents(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Extract và validate JWT token
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                return ResponseEntity.badRequest().body("Invalid or expired token");
            }

            List<User> onlineAgents = supportRequestService.getOnlineAgents();

            Map<String, Object> response = new HashMap<>();
            response.put("agents", onlineAgents);
            response.put("count", onlineAgents.size());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error getting online agents: " + e.getMessage());
        }
    }

    @PostMapping("/requests/{requestId}/complete")
    public ResponseEntity<?> completeRequest(
            @PathVariable Long requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Extract và validate JWT token
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                return ResponseEntity.badRequest().body("Invalid or expired token");
            }

            Long userId = jwtService.extractUserId(token);

            supportRequestService.completeRequest(requestId, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Request completed successfully");
            response.put("requestId", requestId);
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error completing request: " + e.getMessage());
        }
    }

    @PostMapping("/requests/{requestId}/respond")
    public ResponseEntity<?> respondToRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> requestBody,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Extract và validate JWT token
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid or expired token");
                return ResponseEntity.badRequest().body(response);
            }

            Long agentId = jwtService.extractUserId(token);
            String userRole = jwtService.extractRole(token);

            // Validate agent role
            if (!"AGENT".equalsIgnoreCase(userRole)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Only agents can respond to support requests");
                return ResponseEntity.badRequest().body(response);
            }

            // Extract action
            String action = (String) requestBody.get("action");

            // Validate action
            if (!"accept".equals(action) && !"reject".equals(action)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid action. Must be 'accept' or 'reject'");
                return ResponseEntity.badRequest().body(response);
            }

            // Process agent response
            boolean isAccepted = "accept".equals(action);
            SupportRequest updatedRequest = supportRequestService.processAgentResponse(requestId, agentId, isAccepted);

            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId);
            response.put("action", action);
            response.put("status", updatedRequest.getStatus().toString());
            response.put("message", isAccepted ? "Đã chấp nhận yêu cầu hỗ trợ" : "Đã từ chối yêu cầu hỗ trợ");
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Error processing agent response: " +
                    e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<?> cancelSupportRequest(
            @PathVariable Long requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired token"));
            }

            Long userId = jwtService.extractUserId(token);
            boolean cancelled = supportRequestService.cancelSupportRequest(requestId, userId);

            if (cancelled) {
                return ResponseEntity.ok(Map.of(
                        "message", "Yêu cầu hỗ trợ đã được hủy thành công",
                        "requestId", requestId,
                        "timestamp", System.currentTimeMillis()
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Không thể hủy yêu cầu này",
                        "code", "CANNOT_CANCEL"
                ));
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Error cancelling request: " + e.getMessage()
            ));
        }
    }



    private String getInitialMessage(String type, Long agentId) {
        if ("choose_agent".equals(type)) {
            return "Đã gửi yêu cầu đến agent được chọn, đang chờ phản hồi...";
        } else {
            return "Đang tìm agent có sẵn để hỗ trợ bạn...";
        }
    }

    private int getMaxWaitTime(String type) {
        // Thời gian tối đa trước khi timeout (giây)
        if ("choose_agent".equals(type)) {
            return 300; // 5 phút cho choose_agent
        } else {
            return 600; // 10 phút cho quick_support
        }

    }
}
