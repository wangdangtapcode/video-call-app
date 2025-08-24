package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgentStaticResponse {
    private Double avgRating;
    private Integer totalCalls;
    private Long totalCallTime;
}
