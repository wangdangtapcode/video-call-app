package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordingDTO {
    private Long databaseId;
    private String recordingId;
    private String sessionId;
    private String status;
    private String url;
    private Double duration;
    private Long fileSize;
}
