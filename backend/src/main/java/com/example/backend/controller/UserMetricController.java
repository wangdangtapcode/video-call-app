package com.example.backend.controller;

import com.example.backend.enums.AgentStatus;
import com.example.backend.model.UserMetric;
import com.example.backend.service.AgentService;
import com.example.backend.service.UserMetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user-metrics")
public class UserMetricController {
    @Autowired
    private UserMetricsService userMetricsService;

    @PutMapping("/{userId}/status")
    public ResponseEntity<Void> updateUserMetricStatus(@PathVariable Long userId, @RequestParam AgentStatus status) {
        userMetricsService.updateAgentStatus(userId, status);
        return ResponseEntity.ok().build();
    }
}
