package com.example.backend.dto.request;

import lombok.Data;

@Data
public class StartRecordingRequest {
    private Long agentId;
    private Long userId;
}
