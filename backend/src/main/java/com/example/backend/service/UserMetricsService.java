package com.example.backend.service;

import com.example.backend.dto.response.AgentStaticResponse;
import com.example.backend.dto.response.TopEfficiencyAgentsResponse;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


@Service
public class UserMetricsService {

    @Autowired
    private UserMetricRepository userMetricRepository;

    public UserMetric findByUserId(Long userId){
        return userMetricRepository.findByUserId(userId).orElse(null);
    }

    public AgentStaticResponse getTotal(){
        Double avgRating = userMetricRepository.findAvgRating();
        Integer totalCalls = userMetricRepository.findTotalCallsToday();
        Long totalCallTime = userMetricRepository.findTotalCallTimeToday();

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
}
