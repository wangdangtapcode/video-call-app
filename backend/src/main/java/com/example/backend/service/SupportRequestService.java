package com.example.backend.service;

import com.example.backend.dto.response.SupportRequestDTO;
import com.example.backend.enums.AgentStatus;
import com.example.backend.enums.SupportRequestStatus;
import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.SupportRequestRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.UserMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupportRequestService {

    @Autowired
    private SupportRequestRepository supportRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMetricRepository userMetricRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private WebSocketBroadcastService webSocketBroadcastService;

    @Autowired
    private JwtService jwtService;

    public ResponseEntity<?> getSupportRequest(Long requestId, String authHeader) {
        try {
            String token = jwtService.extractTokenFromHeader(authHeader);
            if (token == null || jwtService.isTokenExpired(token)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired token"));
            }

            SupportRequest request = supportRequestRepository.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Support request not found"));
            SupportRequestDTO response = new SupportRequestDTO();
            response.setId(request.getId());
            response.setUserId(request.getUser().getId());
            response.setAgentId(request.getAgent().getId());
            response.setStatus(request.getStatus());
            response.setCreatedAt(request.getCreatedAt() != null ? request.getCreatedAt().toString() : null);
            response.setMatchedAt(request.getMatchedAt() != null ? request.getMatchedAt().toString() : null);
            response.setCompletedAt(request.getCompletedAt() != null ? request.getCompletedAt().toString() : null);
            response.setTimeoutAt(request.getTimeoutAt() != null ? request.getTimeoutAt().toString() : null);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    public SupportRequest createSupportRequest(Long userId, String type, Long agentId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Kiểm tra user đã có active request chưa
        if (supportRequestRepository.hasActiveRequest(user)) {
            throw new RuntimeException("User already has an active support request");
        }

        SupportRequest request = new SupportRequest();
        request.setUser(user);
        request.setType(type);
        request.setStatus(SupportRequestStatus.WAITING);

        // Nếu user chọn agent cụ thể
        if ("choose_agent".equals(type) && agentId != null) {
            request.setPreferredAgentId(agentId);
        }

        return supportRequestRepository.save(request);
    }

    /**
     * Xử lý matching bất đồng bộ
     */
    @Async
    public void processMatching(Long requestId) {
        try {
            // Delay nhỏ để simulate processing time
            Thread.sleep(1000);

            Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);
            if (requestOpt.isEmpty() || !requestOpt.get().isWaiting()) {
                return; // Request đã bị hủy hoặc đã matched
            }

            SupportRequest request = requestOpt.get();

            if (request.isChooseAgent() && request.hasPreferredAgent()) {
                // User chọn agent cụ thể
                processChooseAgentMatching(request);
            } else {
                // Quick support - tự động tìm agent
                processQuickSupportMatching(request);
            }

        } catch (Exception e) {
            System.err.println("Error in matching process: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Xử lý matching cho trường hợp user chọn agent cụ thể
     */
    private void processChooseAgentMatching(SupportRequest request) {
        User preferredAgent = userRepository.findById(request.getPreferredAgentId()).orElse(null);

        if (preferredAgent == null) {
            // Agent không tồn tại
            handleMatchingTimeout(request, "Agent được chọn không tồn tại");
            return;
        }

        // Kiểm tra agent có online không
        UserMetric agentMetric = userMetricRepository.findByUserId(request.getPreferredAgentId()).orElse(null);
        if (agentMetric == null || agentMetric.getStatus() != AgentStatus.ONLINE) {
            // Agent offline
            handleMatchingTimeout(request, "Agent được chọn hiện không online");
            return;
        }

        // Kiểm tra agent có quá tải không
        long activeRequests = supportRequestRepository.countActiveRequestsByAgent(preferredAgent);
        if (activeRequests >= 2) { // Max 3 requests đồng thời
            handleMatchingTimeout(request, "Agent được chọn hiện đang bận");
            return;
        }

        // Match thành công
        matchWithAgent(request, preferredAgent);
    }

    /**
     * Xử lý matching cho quick support
     */
    private void processQuickSupportMatching(SupportRequest request) {
        User bestAgent = findBestAvailableAgent();

        if (bestAgent == null) {
            // Không có agent available
            handleMatchingTimeout(request, "Hiện tại không có agent nào khả dụng");
            return;
        }

        // Match thành công
        matchWithAgent(request, bestAgent);
    }

    /**
     * Match request với agent
     */
    private void matchWithAgent(SupportRequest request, User agent) {
        request.setAgent(agent);
        request.setStatus(SupportRequestStatus.MATCHED);
        request.setMatchedAt(LocalDateTime.now());

        supportRequestRepository.save(request);

        // Notify user và agent qua WebSocket
        notificationService.notifyUserChooseAgent(request);

        // Broadcast to system for monitoring
        webSocketBroadcastService.broadcastSystemMessage(
                "Request " + request.getId() + " matched with agent " + agent.getId(),
                "MATCHING_SUCCESS");

        System.out.println("Successfully matched request " + request.getId() + " with agent " + agent.getId());
    }

    /**
     * Xử lý timeout
     */
    private void handleMatchingTimeout(SupportRequest request, String reason) {
        request.setStatus(SupportRequestStatus.TIMEOUT);
        request.setTimeoutAt(LocalDateTime.now());

        supportRequestRepository.save(request);

        // Notify user qua WebSocket
        notificationService.notifyRequestTimeout(request, reason);

        System.out.println("Request " + request.getId() + " timed out: " + reason);
    }

    /**
     * Tìm agent tốt nhất cho quick support
     */
    private User findBestAvailableAgent() {
        // Lấy tất cả agents online
        List<User> onlineAgents = getOnlineAgents();

        if (onlineAgents.isEmpty()) {
            return null;
        }

        // Tìm agent ít workload nhất
        return onlineAgents.stream()
                .filter(agent -> {
                    long activeRequests = supportRequestRepository.countActiveRequestsByAgent(agent);
                    return activeRequests < 3; // Max 3 requests
                })
                .min((agent1, agent2) -> {
                    long workload1 = supportRequestRepository.countActiveRequestsByAgent(agent1);
                    long workload2 = supportRequestRepository.countActiveRequestsByAgent(agent2);
                    return Long.compare(workload1, workload2);
                })
                .orElse(null);
    }

    /**
     * Lấy danh sách agents online
     */
    public List<User> getOnlineAgents() {
        return userMetricRepository.findAll().stream()
                .filter(metric -> metric.getStatus() == AgentStatus.ONLINE)
                .map(UserMetric::getUser)
                .filter(user -> "AGENT".equalsIgnoreCase(user.getRole().getName()))
                .collect(Collectors.toList());
    }

    /**
     * Complete support request
     */
    public void completeRequest(Long requestId, Long userId) {
        SupportRequest request = supportRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Support request not found"));

        // Verify ownership (either user or agent can complete)
        boolean canComplete = request.getUser().getId().equals(userId) ||
                (request.getAgent() != null && request.getAgent().getId().equals(userId));

        if (!canComplete) {
            throw new RuntimeException("Unauthorized to complete this request");
        }

        request.setStatus(SupportRequestStatus.COMPLETED);
        request.setCompletedAt(LocalDateTime.now());

        supportRequestRepository.save(request);

        // Notify both parties
        notificationService.notifyRequestCompleted(request);
    }

    public SupportRequest processAgentResponse(Long requestId, Long agentId,
            boolean isAccepted) {
        SupportRequest request = supportRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Support request not found"));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        // Verify rằng request được assign cho agent này
        if (request.getAgent() == null ||
                !request.getAgent().getId().equals(agentId)) {
            throw new RuntimeException("Agent is not assigned to this request");
        }

        // Chỉ có thể respond nếu request đang ở trạng thái MATCHED
        if (request.getStatus() != SupportRequestStatus.MATCHED) {
            throw new RuntimeException("Request is not in a state that can be responded to");
        }

        if (isAccepted) {
            // Agent chấp nhận
            request.setStatus(SupportRequestStatus.ACCEPT); // Hoặc có thể tạo status mới như ACCEPTED
            request.setCompletedAt(LocalDateTime.now());

            // Notify user that agent accepted
            notificationService.notifyAgentAccepted(request);

            // Broadcast to both user and agent
            // webSocketBroadcastService.broadcastSupportUpdate(
            // request.getUser().getId(),
            // "AGENT_ACCEPTED",
            // "Agent " + agent.getFullName() + " đã chấp nhận hỗ trợ bạn! Đang chuyển đến
            // video call...");
            //
            // webSocketBroadcastService.broadcastSupportUpdate(
            // agent.getId(),
            // "REQUEST_ACCEPTED",
            // "Bạn đã chấp nhận hỗ trợ user " + request.getUser().getFullName()
            // + ". Đang chuyển đến video call...");

        } else {
            // Agent từ chối
            request.setStatus(SupportRequestStatus.REJECT); // Hoặc có thể tạo status REJECTED
            request.setTimeoutAt(LocalDateTime.now());

            // Notify user that agent rejected
            notificationService.notifyAgentRejected(request);

            // // Broadcast to user
            // webSocketBroadcastService.broadcastSupportUpdate(
            // request.getUser().getId(),
            // "AGENT_REJECTED",
            // "Agent " + agent.getFullName() + " đã từ chối yêu cầu hỗ trợ.");

            // // Broadcast to agent
            // webSocketBroadcastService.broadcastSupportUpdate(
            // agent.getId(),
            // "REQUEST_REJECTED",
            // "Bạn đã từ chối yêu cầu hỗ trợ từ user " + request.getUser().getFullName());

            // TODO: Có thể trigger lại matching process để tìm agent khác
            // processMatching(request.getId());
        }

        return supportRequestRepository.save(request);
    }

    /**
     * Xử lý timeout requests (chạy định kỳ)
     */
    public void processTimeoutRequests() {
        LocalDateTime timeoutTime = LocalDateTime.now().minusMinutes(5); // 5 phút timeout
        List<SupportRequest> timeoutRequests = supportRequestRepository.findTimeoutRequests(timeoutTime);

        for (SupportRequest request : timeoutRequests) {
            handleMatchingTimeout(request, "Hết thời gian chờ (5 phút)");
        }
    }
}