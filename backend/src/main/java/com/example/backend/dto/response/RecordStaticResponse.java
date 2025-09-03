package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecordStaticResponse {
    private Double avgRating;
    private Long totalCall;
    private Double totalCallTime;
}
