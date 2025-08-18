package com.example.backend.dto.response;

import com.example.backend.enums.SupportRequestStatus;
import lombok.Data;

@Data
public class SupportRequestDTO {
    private Long id;
    private String type;
    private SupportRequestStatus status;
    private Long userId;
    private Long agentId;
    private Long preferredAgentId;
    private String createdAt;
    private String matchedAt;
    private String completedAt;
    private String timeoutAt;

}
