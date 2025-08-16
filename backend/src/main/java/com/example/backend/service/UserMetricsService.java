package com.example.backend.service;

import com.example.backend.enums.AgentStatus;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserMetricsService {

    @Autowired
    private UserMetricRepository userMetricRepository;

    @Autowired
    private WebSocketBroadcastService webSocketBroadcastService;

    @Transactional
    public void updateAgentStatus(Long userId, AgentStatus status) {
        Optional<UserMetric> userMetricOpt = userMetricRepository.findByUserId(userId);

        if (userMetricOpt.isPresent()) {
            UserMetric userMetric = userMetricOpt.get();
            AgentStatus oldStatus = userMetric.getStatus();

            if (oldStatus != status) {
                userMetric.setStatus(status);
                userMetricRepository.save(userMetric);

                webSocketBroadcastService.broadcastAgentStatusChange(userId, status);
            }
        }
    }


    public AgentStatus getAgentStatus(Long userId) {
        return userMetricRepository.findByUserId(userId)
                .map(UserMetric::getStatus)
                .orElse(AgentStatus.OFFLINE);
    }

    public UserMetric findByUserId(Long userId){
        return userMetricRepository.findByUserId(userId).orElse(null);
    }
}
