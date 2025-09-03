package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RecordingResponse {
    private Long id;
    private String sessionId;
    private String recordingId;
    private Long agentId;
    private String agentFullName;
    private Long userId;
    private String userFullName;
    private Integer rating;
    private String status;
    private Double duration;
    private Long fileSize;
    private String s3Url;
    private String s3Key;
    private LocalDateTime startedAt;
    private LocalDateTime stoppedAt;
}
