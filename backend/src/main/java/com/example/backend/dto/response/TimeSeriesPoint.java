package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class TimeSeriesPoint {
    private LocalDateTime bucket; // thời điểm gộp (giờ/ngày/tháng)
    private Long count; // số lượng cuộc gọi
    private Double sum; // tổng thời gian gọi
}