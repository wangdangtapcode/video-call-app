package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

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
    private LocalDateTime startedAt;
    private LocalDateTime stoppedAt;
    private List<RecordingSegmentDTO> segments;
}
