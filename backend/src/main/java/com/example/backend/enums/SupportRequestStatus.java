package com.example.backend.enums;

public enum SupportRequestStatus {
    WAITING, // Đang chờ tìm agent
    MATCHED, // Đã ghép với agent
    ACCEPT, // Agent đồng ý
    REJECT, // Agent từ chối
    TIMEOUT,
    COMPLETED,
    CANCELLED

}
