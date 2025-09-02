package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMetricResponse {
    private Long userId;
    private String userName;
    private String userEmail;
    private Double rating;
    private Integer totalCalls;
    private Double totalCallTime;
    private Double averageCallDuration;
    private Integer successfulCalls;
    private Integer failedCalls;
    private Integer totalRatings;
    private Integer fiveStarRatings;
    private Integer fourStarRatings;
    private Integer threeStarRatings;
    private Integer twoStarRatings;
    private Integer oneStarRatings;
    private Double averageResponseTime;

    // Helper methods for frontend
    public Double getSuccessRate() {
        if (totalCalls == null || totalCalls == 0)
            return 0.0;
        return (double) successfulCalls / totalCalls * 100;
    }

    public String getFormattedTotalCallTime() {
        if (totalCallTime == null || totalCallTime == 0)
            return "0h 0m";
        long totalSeconds = totalCallTime.longValue();
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        return hours + "h " + minutes + "m";
    }

    public String getFormattedAverageResponseTime() {
        if (averageResponseTime == null || averageResponseTime == 0)
            return "0s";
        long totalSeconds = averageResponseTime.longValue();
        if (totalSeconds < 60)
            return totalSeconds + "s";
        long minutes = totalSeconds / 60;
        long seconds = totalSeconds % 60;
        return minutes + "m " + seconds + "s";
    }
}
