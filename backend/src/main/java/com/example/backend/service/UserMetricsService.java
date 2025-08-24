package com.example.backend.service;

import com.example.backend.dto.response.AgentStaticResponse;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


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
}
