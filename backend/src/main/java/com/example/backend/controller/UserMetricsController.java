package com.example.backend.controller;

import com.example.backend.model.UserMetric;
import com.example.backend.service.UserMetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user-metrics")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class UserMetricsController {

    @Autowired
    private UserMetricsService userMetricsService;

    /**
     * Lấy metrics của một user cụ thể
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserMetrics(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(userMetricsService.getUserMetricResponse(userId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to get user metrics: " + e.getMessage()));
        }
    }

    /**
     * Lấy tổng quan metrics của tất cả agents
     */
    @GetMapping("/total")
    public ResponseEntity<?> getTotalMetrics() {
        try {
            return ResponseEntity.ok(userMetricsService.getTotal());
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to get total metrics: " + e.getMessage()));
        }
    }

    /**
     * Reset metrics cho một user (chỉ admin)
     */
    @PostMapping("/reset/{userId}")
    public ResponseEntity<?> resetUserMetrics(@PathVariable Long userId) {
        try {
            userMetricsService.resetUserMetrics(userId);
            return ResponseEntity.ok(Map.of("message", "User metrics reset successfully", "userId", userId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to reset user metrics: " + e.getMessage()));
        }
    }

    /**
     * Cập nhật rating manually (for testing purposes)
     */
    // @PostMapping("/rating")
    // public ResponseEntity<?> updateRating(@RequestBody Map<String, Object>
    // request) {
    // try {
    // Long agentId = Long.valueOf(request.get("agentId").toString());
    // Integer rating = Integer.valueOf(request.get("rating").toString());

    // userMetricsService.updateRating(agentId, rating);
    // return ResponseEntity.ok(Map.of("message", "Rating updated successfully"));
    // } catch (Exception e) {
    // return ResponseEntity.status(500)
    // .body(Map.of("error", "Failed to update rating: " + e.getMessage()));
    // }
    // }

    /**
     * Cập nhật call metrics manually (for testing purposes)
     */
    // @PostMapping("/call-completed")
    // public ResponseEntity<?> updateCallCompleted(@RequestBody Map<String, Object>
    // request) {
    // try {
    // Long agentId = Long.valueOf(request.get("agentId").toString());
    // Long userId = Long.valueOf(request.get("userId").toString());
    // Long duration = Long.valueOf(request.get("duration").toString());
    // Boolean isSuccessful =
    // Boolean.valueOf(request.get("isSuccessful").toString());

    // userMetricsService.updateCallCompleted(agentId, userId, duration,
    // isSuccessful);
    // return ResponseEntity.ok(Map.of("message", "Call metrics updated
    // successfully"));
    // } catch (Exception e) {
    // return ResponseEntity.status(500)
    // .body(Map.of("error", "Failed to update call metrics: " + e.getMessage()));
    // }
    // }
}
