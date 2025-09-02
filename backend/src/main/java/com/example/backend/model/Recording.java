package com.example.backend.model;

import com.example.backend.enums.RecordingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "recordings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "recording_id", nullable = false, unique = true)
    private String recordingId;

    @Column(name ="agent_id")
    private Long agentId;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecordingStatus status;

    @Column(name = "request_id")
    private Long requestId;

    @Column(name = "duration")
    private Double duration;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "s3_url", length = 2048)
    private String s3Url;

    @Column(name = "s3_key")
    private String s3Key;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;

    @OneToMany(mappedBy = "recording", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RecordingSegment> segments;
}
