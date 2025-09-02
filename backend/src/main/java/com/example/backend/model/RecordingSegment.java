package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Entity
@Table(name = "recording_segments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recording_id")
    private Recording recording;

    @Column(name = "segment_start_time")
    private LocalDateTime segmentStartTime;

    @Column(name = "segment_end_time")
    private LocalDateTime segmentEndTime;

    @Column(name = "start_offset_seconds")
    private Double startOffsetSeconds; // Thời gian bắt đầu tính từ đầu recording chính (giây)

    @Column(name = "end_offset_seconds")
    private Double endOffsetSeconds; // Thời gian kết thúc tính từ đầu recording chính (giây)

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
