package com.example.backend.repository;

import com.example.backend.model.RecordingSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecordingSegmentRepository extends JpaRepository<RecordingSegment,Long> {
    List<RecordingSegment> findByRecordingIdOrderByStartOffsetSecondsAsc(Long recordingId);
    Long countByRecordingId(Long recordingId);

    // Xóa tất cả segments của recording
    void deleteByRecordingId(Long recordingId);
}
