package com.example.backend.repository;

import com.example.backend.model.Recording;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecordingRepository extends JpaRepository<Recording,Long> {
    Optional<Recording> findByRecordingId (String recordingId);
    List<Recording> findBySessionId(String sessionId);

}
