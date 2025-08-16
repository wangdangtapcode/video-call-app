package com.example.backend.enums;

public enum SupportRequestStatus {
    WAITING, // Đang chờ tìm agent
    MATCHED, // Đã ghép với agent
    COMPLETED, // Đã hoàn thành
    TIMEOUT // Quá thời gian chờ
}
