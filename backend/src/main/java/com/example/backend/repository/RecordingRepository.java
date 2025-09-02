package com.example.backend.repository;

import com.example.backend.model.Recording;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecordingRepository extends JpaRepository<Recording,Long> {
    Optional<Recording> findByRecordingId (String recordingId);
    List<Recording> findBySessionId(String sessionId);

    @Query("""
    SELECT r FROM Recording r
    WHERE (:agentId IS NULL OR r.agentId = :agentId)
      AND (:userId IS NULL OR r.userId = :userId)
      AND (COALESCE(:start, r.startedAt) <= r.startedAt)
      AND (COALESCE(:end, r.stoppedAt) >= r.stoppedAt)
    """)
    Page<Recording> findByFilters(
            @Param("agentId") Long agentId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);
}
