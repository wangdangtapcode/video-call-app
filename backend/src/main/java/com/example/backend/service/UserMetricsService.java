package com.example.backend.service;

import com.example.backend.dto.response.AgentStaticResponse;
import com.example.backend.dto.response.UserMetricResponse;
import com.example.backend.model.User;
import com.example.backend.dto.response.TopEfficiencyAgentsResponse;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserMetricRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import java.time.LocalDateTime;

@Service
@Transactional
public class UserMetricsService {

    @Autowired
    private UserMetricRepository userMetricRepository;

    @Autowired
    private UserRepository userRepository;

    public UserMetric findByUserId(Long userId) {
        return userMetricRepository.findByUserId(userId).orElse(null);
    }

    /**
     * Lấy metrics cho frontend với format đẹp
     */
    public UserMetricResponse getUserMetricResponse(Long userId) {
        UserMetric userMetric = getOrCreateUserMetric(userId);
        User user = userMetric.getUser();

        UserMetricResponse response = UserMetricResponse.builder()
                .userId(user.getId())
                .userName(user.getFullName())
                .userEmail(user.getEmail())
                .rating(userMetric.getRating())
                .totalCalls(userMetric.getTotalCalls())
                .totalCallTime(userMetric.getTotalCallTime())
                .averageCallDuration(userMetric.getAverageCallDuration())
                .successfulCalls(userMetric.getSuccessfulCalls())
                .failedCalls(userMetric.getFailedCalls())
                .totalRatings(userMetric.getTotalRatings())
                .fiveStarRatings(userMetric.getFiveStarRatings())
                .fourStarRatings(userMetric.getFourStarRatings())
                .threeStarRatings(userMetric.getThreeStarRatings())
                .twoStarRatings(userMetric.getTwoStarRatings())
                .oneStarRatings(userMetric.getOneStarRatings())
                .averageResponseTime(userMetric.getAverageResponseTime())
                .build();

        return response;
    }

    public AgentStaticResponse getTotal() {
        Double avgRating = userMetricRepository.findAvgRating();
        Integer totalCalls = userMetricRepository.findTotalCallsToday();
        Double totalCallTime = userMetricRepository.findTotalCallTimeToday();

        return new AgentStaticResponse(avgRating, totalCalls, totalCallTime);
    }

    public Map<String, Long> getRatingDistribution() {
        List<Object[]> rawResult = userMetricRepository.getRatingDistribution();

        Map<String, Long> distribution = new LinkedHashMap<>();
        // Khởi tạo mặc định tất cả bin = 0
        distribution.put("0-1", 0L);
        distribution.put("1-2", 0L);
        distribution.put("2-3", 0L);
        distribution.put("3-4", 0L);
        distribution.put("4-5", 0L);

        for (Object[] row : rawResult) {
            String range = (String) row[0];
            Long count = (Long) row[1];
            distribution.put(range, count);
        }

        return distribution;
    }

    public List<TopEfficiencyAgentsResponse> getTopEfficiencyUsers(int topN) {
        return userMetricRepository.findAllWithCalls().stream()
                .map(u -> {
                    Double efficiency = (u.getRating() * u.getTotalCalls()) / (u.getTotalCallTime()/30 + 1);
                    return new TopEfficiencyAgentsResponse(u.getUser().getId(), u.getUser().getFullName(), efficiency);
                })
                .sorted((a, b) -> Double.compare((Double) b.getEfficiency(), (Double)a.getEfficiency()))
                .limit(topN)
                .toList();
    }

    /**
     * Tạo hoặc lấy UserMetric cho user
     */
    public UserMetric getOrCreateUserMetric(Long userId) {
        UserMetric userMetric = findByUserId(userId);
        if (userMetric == null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            userMetric = new UserMetric();
            userMetric.setUser(user);
            userMetric = userMetricRepository.save(userMetric);
        }
        return userMetric;
    }

    /**
     * Cập nhật metrics khi cuộc gọi bắt đầu
     */
    public void updateCallStarted(Long agentId, LocalDateTime requestTime, LocalDateTime completedTime) {
        // Cập nhật metrics cho agent
        if (agentId != null) {
            UserMetric agentMetric = getOrCreateUserMetric(agentId);
            agentMetric.setTotalCalls(agentMetric.getTotalCalls() + 1);
            agentMetric.setTotalAcceptedCalls(agentMetric.getTotalAcceptedCalls() + 1);

            // Tính toán response time (thời gian từ khi request đến khi completed)
            if (requestTime != null && completedTime != null) {
                Double responseTimeSeconds = java.time.Duration.between(requestTime, completedTime).toMillis() / 1000.0;
                updateAverageResponseTime(agentMetric, responseTimeSeconds);
            }

            userMetricRepository.save(agentMetric);
        }
    }

    public void updateCallRejected(Long agentId, LocalDateTime requestTime, LocalDateTime rejectedTime) {
        if (agentId != null) {
            UserMetric agentMetric = getOrCreateUserMetric(agentId);
            agentMetric.setTotalRejectedCalls(agentMetric.getTotalRejectedCalls() + 1);
            userMetricRepository.save(agentMetric);

            // Tính toán response time (thời gian từ khi request đến khi rejected)
            if (requestTime != null && rejectedTime != null) {
                Double responseTimeSeconds = java.time.Duration.between(requestTime, rejectedTime).toMillis() / 1000.0;
                updateAverageResponseTime(agentMetric, responseTimeSeconds);
            }
        }
    }

    /**
     * Cập nhật metrics khi cuộc gọi kết thúc
     */
    public void updateCallCompleted(Long agentId, Double callDurationSeconds, boolean isSuccessful) {
        if (agentId != null) {
            UserMetric agentMetric = getOrCreateUserMetric(agentId);

            // Cập nhật tổng thời gian gọi
            agentMetric.setTotalCallTime(agentMetric.getTotalCallTime() + callDurationSeconds);

            // Cập nhật successful/failed calls
            if (isSuccessful) {
                agentMetric.setSuccessfulCalls(agentMetric.getSuccessfulCalls() + 1);
            } else {
                agentMetric.setFailedCalls(agentMetric.getFailedCalls() + 1);
            }

            // Cập nhật average call duration
            updateAverageCallDuration(agentMetric);

            userMetricRepository.save(agentMetric);
        }
    }

    /**
     * Cập nhật metrics khi có rating từ user
     */
    public void updateRating(Long agentId, int rating) {
        if (agentId != null && rating >= 1 && rating <= 5) {
            UserMetric agentMetric = getOrCreateUserMetric(agentId);

            // Cập nhật tổng số ratings
            agentMetric.setTotalRatings(agentMetric.getTotalRatings() + 1);

            // Cập nhật rating theo từng sao
            switch (rating) {
                case 5:
                    agentMetric.setFiveStarRatings(agentMetric.getFiveStarRatings() + 1);
                    break;
                case 4:
                    agentMetric.setFourStarRatings(agentMetric.getFourStarRatings() + 1);
                    break;
                case 3:
                    agentMetric.setThreeStarRatings(agentMetric.getThreeStarRatings() + 1);
                    break;
                case 2:
                    agentMetric.setTwoStarRatings(agentMetric.getTwoStarRatings() + 1);
                    break;
                case 1:
                    agentMetric.setOneStarRatings(agentMetric.getOneStarRatings() + 1);
                    break;
            }

            // Tính toán lại average rating
            updateAverageRating(agentMetric);

            userMetricRepository.save(agentMetric);
        }
    }

    /**
     * Cập nhật response time khi agent phản hồi request
     */
    public void updateResponseTime(Long agentId, Double responseTimeSeconds) {
        if (agentId != null) {
            UserMetric agentMetric = getOrCreateUserMetric(agentId);
            updateAverageResponseTime(agentMetric, responseTimeSeconds);
            userMetricRepository.save(agentMetric);
        }
    }

    /**
     * Tính toán lại average rating
     */
    private void updateAverageRating(UserMetric userMetric) {
        if (userMetric.getTotalRatings() > 0) {
            double totalScore = (userMetric.getFiveStarRatings() * 5) +
                    (userMetric.getFourStarRatings() * 4) +
                    (userMetric.getThreeStarRatings() * 3) +
                    (userMetric.getTwoStarRatings() * 2) +
                    (userMetric.getOneStarRatings() * 1);

            double averageRating = totalScore / userMetric.getTotalRatings();
            userMetric.setRating(Math.round(averageRating * 100.0) / 100.0); // Làm tròn 2 chữ số
        }
    }

    /**
     * Tính toán lại average call duration
     */
    private void updateAverageCallDuration(UserMetric userMetric) {
        if (userMetric.getTotalCalls() > 0) {
            double averageDuration = (double) userMetric.getTotalCallTime() / userMetric.getTotalCalls();
            userMetric.setAverageCallDuration(Math.round(averageDuration * 100.0) / 100.0);
        }
    }

    /**
     * Cập nhật average response time
     */
    private void updateAverageResponseTime(UserMetric userMetric, Double newResponseTime) {
        if (userMetric.getTotalAcceptedCalls() + userMetric.getTotalRejectedCalls() > 0) {
            // Tính weighted average dựa trên số cuộc gọi
            Double currentAverage = userMetric.getAverageResponseTime();
            long totalCalls = userMetric.getTotalAcceptedCalls() + userMetric.getTotalRejectedCalls();

            // Công thức: new_avg = (old_avg * (n-1) + new_value) / n
            Double newAverage = (currentAverage * (totalCalls - 1) + newResponseTime) / totalCalls;
            userMetric.setAverageResponseTime(newAverage);
        } else {
            userMetric.setAverageResponseTime(newResponseTime);
        }
    }

    /**
     * Reset metrics cho một user (dùng cho testing hoặc admin functions)
     */
    public void resetUserMetrics(Long userId) {
        UserMetric userMetric = findByUserId(userId);
        if (userMetric != null) {
            userMetric.setRating(0.00);
            userMetric.setTotalCalls(0);
            userMetric.setTotalCallTime(0.00);
            userMetric.setAverageCallDuration(0.00);
            userMetric.setSuccessfulCalls(0);
            userMetric.setFailedCalls(0);
            userMetric.setTotalRatings(0);
            userMetric.setFiveStarRatings(0);
            userMetric.setFourStarRatings(0);
            userMetric.setThreeStarRatings(0);
            userMetric.setTwoStarRatings(0);
            userMetric.setOneStarRatings(0);
            userMetric.setAverageResponseTime(0.00);

            userMetricRepository.save(userMetric);
        }
    }
}
