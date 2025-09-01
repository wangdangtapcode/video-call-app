package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TopEfficiencyAgentsResponse {
    private Long id;
    private String fullName;
    private Double efficiency;
}
