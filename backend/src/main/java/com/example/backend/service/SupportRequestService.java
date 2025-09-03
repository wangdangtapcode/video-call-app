package com.example.backend.service;

import com.example.backend.dto.response.SupportRequestDTO;
import com.example.backend.enums.ResponseStatus;
import com.example.backend.enums.UserStatus;
import com.example.backend.enums.SupportRequestStatus;
import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;

import com.example.backend.repository.SupportRequestRepository;
import com.example.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupportRequestService {

    @Autowired
    private SupportRequestRepository supportRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WebSocketBroadcastService webSocketBroadcastService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TaskScheduler taskScheduler;

    @Autowired
    private UserMetricsService userMetricsService;

    private final Map<Long, ScheduledFuture<?>> timeoutTasks = new ConcurrentHashMap<>();

    private final Map<Long, Set<Long>> matchingHashtagMap = new ConcurrentHashMap<>();

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

        SupportRequest savedRequest = supportRequestRepository.save(request);

        // Schedule timeout task
        scheduleTimeoutTask(savedRequest);

        return savedRequest;
    }

    /**
     * Xử lý matching bất đồng bộ
     */
    @Async
    public void processMatching(Long requestId) {
        try {
            // Delay nhỏ để simulate processing time
            Thread.sleep(2000);

            Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);
            if (requestOpt.isEmpty() || !requestOpt.get().isWaiting()) {
                return; // Request đã bị hủy hoặc đã matched
            }

            SupportRequest request = requestOpt.get();
            webSocketBroadcastService.notifyUserMatchingProgress(request, "Đang tìm kiếm agent...");
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
        if (preferredAgent.getStatus() != UserStatus.ONLINE) {
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
        // Simulate tìm kiếm agent với multiple attempts
        Set<Long> matchingHashtagList = matchingHashtagMap.get(request.getUser().getId());
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                // Gửi progress update
                webSocketBroadcastService.notifyUserMatchingProgress(
                        request,
                        "Đang tìm agent... (Lần thử " + attempt + "/3)");

                User bestAgent = findBestAvailableAgent(matchingHashtagList);

                if (bestAgent != null) {
                    matchWithAgent(request, bestAgent);
                    return;
                }

                // Wait before next attempt
                if (attempt < 3) {
                    Thread.sleep(5000); // 5 giây giữa các lần thử
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        // Không tìm được agent sau 3 lần thử
        handleMatchingTimeout(request, "Hiện tại không có agent nào khả dụng. Vui lòng thử lại sau.");
    }

    /**
     * Match request với agent
     */
    private void matchWithAgent(SupportRequest request, User agent) {
        // Cancel timeout task
        cancelTimeoutTask(request.getId());

        request.setAgent(agent);
        request.setStatus(SupportRequestStatus.MATCHED);
        request.setMatchedAt(LocalDateTime.now());

        supportRequestRepository.save(request);

        // Notify user và agent qua WebSocket
        if (!request.isChooseAgent()) {
            webSocketBroadcastService.notifyUserMatched(request);
        }
        webSocketBroadcastService.notifyAgentNewRequest(request);

        System.out.println("Successfully matched request " + request.getId() + " with agent " + agent.getId());
    }

    private void handleMatchingTimeout(SupportRequest request, String reason) {
        cancelTimeoutTask(request.getId());

        request.setStatus(SupportRequestStatus.TIMEOUT);
        request.setTimeoutAt(LocalDateTime.now());
        supportRequestRepository.save(request);

        webSocketBroadcastService.notifyUserMatchingTimeout(request, reason);

        System.out.println("Request " + request.getId() + " timed out: " + reason);
    }

    private void handleRequestTimeout(Long requestId) {
        Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);
        if (requestOpt.isEmpty() || !requestOpt.get().isWaiting()) {
            return;
        }

        SupportRequest request = requestOpt.get();
        handleMatchingTimeout(request, "Yêu cầu chưa được phản hồi trong thời gian quy định");
    }

    /**
     * Tìm agent tốt nhất cho quick support
     */
    private User findBestAvailableAgent(Set<Long> matchingHashtagList) {

        Set<Long> hashtags = (matchingHashtagList != null) ? matchingHashtagList : Collections.emptySet();

        // Lấy tất cả agents online
        List<User> onlineAgents = getOnlineAgents();

        if (onlineAgents.isEmpty()) {
            return null;
        }

        // Tìm agent ít workload nhất
        return onlineAgents.stream()
                .filter(agent -> !hashtags.contains(agent.getId()))
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
        return userRepository.findAll().stream()
                .filter(user -> user.getStatus() == UserStatus.ONLINE)
                .filter(user -> "AGENT".equalsIgnoreCase(user.getRole()))
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
        webSocketBroadcastService.notifyRequestCompleted(request);
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
            request.setStatus(SupportRequestStatus.COMPLETED);
            request.setResponse(ResponseStatus.ACCEPT);
            request.setCompletedAt(LocalDateTime.now());

            matchingHashtagMap.remove(request.getUser().getId());
            // Notify user that agent accepted
            webSocketBroadcastService.notifyAgentAccepted(request);

            userMetricsService.updateCallStarted(agentId, request.getCreatedAt(),
                    request.getCompletedAt());

        } else {
            // Agent từ chối
            request.setStatus(SupportRequestStatus.COMPLETED);
            request.setResponse(ResponseStatus.REJECT);
            request.setCompletedAt(LocalDateTime.now());
            if (request.getType().equals("quick_support")) {
                Set<Long> matchingHashtagList = matchingHashtagMap.get(request.getUser().getId());

                if (matchingHashtagList == null) {
                    matchingHashtagList = new HashSet<>();
                }
                matchingHashtagList.add(agentId);
                matchingHashtagMap.put(request.getUser().getId(), matchingHashtagList);
            }

            // Notify user that agent rejected
            webSocketBroadcastService.notifyAgentRejected(request);

            userMetricsService.updateCallRejected(agentId,
                    request.getCreatedAt(),
                    request.getCompletedAt());

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

    private long getOnlineAgentsCount() {
        return userRepository.countByRoleAndStatus("AGENT", UserStatus.ONLINE);
    }

    // Helper methods để hỗ trợ frontend timer
    public int getEstimatedWaitTime(String type, Long agentId) {
        if ("choose_agent".equals(type)) {
            // Kiểm tra agent có online không
            User agent = userRepository.findById(agentId).orElse(null);
            if (agent != null && agent.getStatus() == UserStatus.ONLINE) {
                return 30; // 30 giây nếu agent online
            }
            return 120; // 2 phút nếu agent offline
        } else {
            // Quick support - tính dựa trên số agent online
            long onlineAgentsCount = getOnlineAgentsCount();
            if (onlineAgentsCount == 0) {
                return 300; // 5 phút nếu không có agent
            } else if (onlineAgentsCount < 3) {
                return 120; // 2 phút nếu ít agent
            } else {
                return 60; // 1 phút nếu nhiều agent
            }
        }
    }

    public boolean cancelSupportRequest(Long requestId, Long userId) {
        Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);

        if (requestOpt.isEmpty()) {
            throw new RuntimeException("Request not found");
        }

        SupportRequest request = requestOpt.get();

        // Verify ownership
        if (!request.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to cancel this request");
        }

        // Chỉ có thể hủy khi đang WAITING
        if (!request.isWaiting()) {
            return false;
        }

        // Cancel timeout task
        cancelTimeoutTask(requestId);

        // Update status
        request.setStatus(SupportRequestStatus.CANCELLED);
        request.setCompletedAt(LocalDateTime.now());
        supportRequestRepository.save(request);

        // Notify via WebSocket
        webSocketBroadcastService.notifyUserRequestCancelled(request);

        return true;
    }

    private void scheduleTimeoutTask(SupportRequest request) {
        int timeoutSeconds = getTimeoutForType(request.getType());

        ScheduledFuture<?> timeoutTask = taskScheduler.schedule(() -> {
            handleRequestTimeout(request.getId());
        }, Instant.now().plusSeconds(timeoutSeconds));

        timeoutTasks.put(request.getId(), timeoutTask);
    }

    private void cancelTimeoutTask(Long requestId) {
        ScheduledFuture<?> task = timeoutTasks.remove(requestId);
        if (task != null && !task.isDone()) {
            task.cancel(false);
        }
    }

    private int getTimeoutForType(String type) {
        return "choose_agent".equals(type) ? 300 : 600; // 5 phút vs 10 phút
    }

    public void removeUserHashtags(Long userId) {
        matchingHashtagMap.remove(userId);
    }

    /**
     * Cancel permission preparation process
     */
    public boolean cancelPermissionPreparation(Long requestId, Long userId, String userRole) {
        Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);

        if (requestOpt.isEmpty()) {
            throw new RuntimeException("Request not found");
        }

        SupportRequest request = requestOpt.get();

        if (request.getStatus() != SupportRequestStatus.COMPLETED) {
            return false;
        }

        // Verify ownership (user hoặc agent trong request này)
        boolean canCancel = request.getUser().getId().equals(userId) ||
                (request.getAgent() != null && request.getAgent().getId().equals(userId));

        if (!canCancel) {
            throw new RuntimeException("Unauthorized to cancel this permission preparation");
        }

        // Notify người còn lại
        boolean isUser = "USER".equalsIgnoreCase(userRole);
        Long notifyTo = isUser ? request.getAgent().getId() : request.getUser().getId();

        webSocketBroadcastService.notifyPermissionCancelled(requestId, userId, notifyTo, isUser);

        System.out.println("Permission preparation cancelled for request " + requestId +
                " by " + (isUser ? "user" : "agent") + " " + userId);

        return true;
    }

    /**
     * End call và notify người còn lại
     */
    public boolean endCall(Long requestId, Long userId, String userRole) {
        Optional<SupportRequest> requestOpt = supportRequestRepository.findById(requestId);

        if (requestOpt.isEmpty()) {
            throw new RuntimeException("Request not found");
        }

        SupportRequest request = requestOpt.get();

        // Chỉ có thể end call khi đang ở trạng thái COMPLETED (đang trong call)
        if (request.getStatus() != SupportRequestStatus.COMPLETED) {
            return false;
        }

        // Verify ownership (user hoặc agent trong request này)
        boolean canEnd = request.getUser().getId().equals(userId) ||
                (request.getAgent() != null && request.getAgent().getId().equals(userId));

        if (!canEnd) {
            throw new RuntimeException("Unauthorized to end this call");
        }

        // Notify người còn lại
        boolean isUser = "USER".equalsIgnoreCase(userRole);
        Long notifyTo = isUser ? request.getAgent().getId() : request.getUser().getId();

        webSocketBroadcastService.notifyCallEnded(requestId, userId, notifyTo, isUser);

        System.out.println("Call ended for request " + requestId +
                " by " + (isUser ? "user" : "agent") + " " + userId);

        return true;
    }
}