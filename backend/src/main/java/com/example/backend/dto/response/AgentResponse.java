package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class AgentResponse {
    private Long id;
    private String email;
    private String fullName;
    private String status;
    private Double rating;
    private Integer totalCall;
    private Long totalCallTime;
}