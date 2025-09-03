package com.example.backend.service;

import com.example.backend.dto.response.RecordingDTO;
import com.example.backend.enums.RecordingStatus;
import com.example.backend.model.RecordingSegment;
import com.example.backend.repository.RecordingRepository;
import com.example.backend.repository.RecordingSegmentRepository;
import io.openvidu.java.client.*;
import io.openvidu.java.client.RecordingProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

@Service
public class OpenViduService {

    @Value("${openvidu.url}")
    private String OPENVIDU_URL;

    @Value("${openvidu.secret}")
    private String OPENVIDU_SECRET;

    private OpenVidu openVidu;

    @Autowired
    private RecordService recordService;

    @Autowired
    private RecordingRepository recordingRepository;

    @Autowired
    private RecordingSegmentRepository recordingSegmentRepository;

    @Autowired
    private UserMetricsService userMetricsService;

    @PostConstruct
    public void init() {
        this.openVidu = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
        System.out.println("OpenVidu initialized with URL: " + OPENVIDU_URL);
    }

    public ResponseEntity<?> createSession(Map<String, Object> params) {
        try {
            System.out.println("Creating session with params: " + params);

            // Lấy customSessionId từ params hoặc để OpenVidu tự tạo
            String customSessionId = (String) params.get("customSessionId");

            SessionProperties.Builder propertiesBuilder = new SessionProperties.Builder();

            if (customSessionId != null && !customSessionId.isEmpty()) {
                propertiesBuilder.customSessionId(customSessionId);
            }

            SessionProperties properties = propertiesBuilder.build();
            Session session = openVidu.createSession(properties);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", session.getSessionId());

            System.out.println("Session created successfully: " + session.getSessionId());
            return ResponseEntity.ok(response);

        } catch (OpenViduJavaClientException e) {
            System.err.println("OpenVidu Java Client Exception: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "OpenVidu client error: " + e.getMessage()));
        } catch (OpenViduHttpException e) {
            System.err.println("OpenVidu HTTP Exception: " + e.getMessage());

            if (e.getStatus() == 409) {
                // Session already exists, return existing session
                try {
                    String customSessionId = (String) params.get("customSessionId");
                    if (customSessionId != null) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("sessionId", customSessionId);
                        return ResponseEntity.ok(response);
                    }
                } catch (Exception ex) {
                    // Ignore and fall through to error response
                }
            }

            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", "OpenVidu HTTP error: " + e.getMessage()));
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Unexpected error: " + e.getMessage()));
        }
    }

    public ResponseEntity<?> createToken(String sessionId, Map<String, Object> params) {
        try {
            System.out.println("Creating token for session: " + sessionId + " with params: " + params);

            Session session = openVidu.getActiveSession(sessionId);
            if (session == null) {
                System.err.println("Session not found: " + sessionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Session not found: " + sessionId));
            }

            ConnectionProperties.Builder propertiesBuilder = new ConnectionProperties.Builder();

            // Set connection role
            String role = (String) params.get("role");
            if ("PUBLISHER".equals(role)) {
                propertiesBuilder.role(OpenViduRole.PUBLISHER);
            } else if ("SUBSCRIBER".equals(role)) {
                propertiesBuilder.role(OpenViduRole.SUBSCRIBER);
            } else {
                propertiesBuilder.role(OpenViduRole.PUBLISHER); // Default
            }

            // Set connection data
            String data = (String) params.get("data");
            if (data != null) {
                propertiesBuilder.data(data);
            }

            // ConnectionProperties connectionProperties = propertiesBuilder.build();
            ConnectionProperties connectionProperties = ConnectionProperties.fromJson(params).build();
            Connection connection = session.createConnection(connectionProperties);

            Map<String, Object> response = new HashMap<>();
            response.put("token", connection.getToken());
            response.put("connectionId", connection.getConnectionId());

            System.out.println("Token created successfully for session: " + sessionId);
            return ResponseEntity.ok(response);

        } catch (OpenViduJavaClientException e) {
            System.err.println("OpenVidu Java Client Exception: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "OpenVidu client error: " + e.getMessage()));
        } catch (OpenViduHttpException e) {
            System.err.println("OpenVidu HTTP Exception: " + e.getMessage());
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", "OpenVidu HTTP error: " + e.getMessage()));
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Unexpected error: " + e.getMessage()));
        }
    }

    public RecordingDTO startAutoRecording(String sessionId, Long agentId, Long userId, Long requestId) throws  OpenViduHttpException, OpenViduJavaClientException {

        userMetricsService.updateTotalCalls(agentId);
        RecordingProperties properties = new RecordingProperties.Builder()
                .outputMode(Recording.OutputMode.COMPOSED)
                .recordingLayout(RecordingLayout.BEST_FIT)
                .hasAudio(true)
                .hasVideo(true)
                .build();
        Recording recording = this.openVidu.startRecording(sessionId,properties);
        com.example.backend.model.Recording dbRecording = com.example.backend.model.Recording.builder()
                .recordingId(recording.getId())
                .sessionId(sessionId)
                .agentId(agentId)
                .userId(userId)
                .requestId(requestId)
                .status(RecordingStatus.STARTED)
                .startedAt(LocalDateTime.now())
                .build();
        recordingRepository.save(dbRecording);
        return RecordingDTO.builder()
                .recordingId(recording.getId())
                .sessionId(recording.getSessionId())
                .status(recording.getStatus().name())
                .databaseId(dbRecording.getId())
                .build();
    }

    public RecordingDTO stopAutoRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException{
        Recording recording = this.openVidu.stopRecording(recordingId);

        com.example.backend.model.Recording dbRecording = recordService.updateRecordingDetails(recordingId, recording);
        recordService.updateRecordingStatus(recordingId, RecordingStatus.STOPPED);
        recordService.uploadToS3(recording);

        return RecordingDTO.builder()
                .recordingId(recording.getId())
                .sessionId(recording.getSessionId())
                .status(dbRecording.getStatus().toString())
                .url(dbRecording.getS3Url())
                .duration(recording.getDuration())
                .fileSize(recording.getSize())
                .databaseId(dbRecording.getId())
                .build();

    }

    public Long startAgentRecording(String sessionId) {
        // Tìm full session recording
        com.example.backend.model.Recording fullSessionRecording =
                recordingRepository.findBySessionId(sessionId)
                        .orElseThrow(() -> new RuntimeException("Full session recording not found"));

        // Tính offset time từ lúc bắt đầu full recording
        double offsetSeconds = Duration.between(fullSessionRecording.getStartedAt(), LocalDateTime.now())
                .toSeconds();

        // Tạo recording segment
        RecordingSegment segment = RecordingSegment.builder()
                .recording(fullSessionRecording)
                .segmentStartTime(LocalDateTime.now())
                .startOffsetSeconds(offsetSeconds)
                .createdAt(LocalDateTime.now())
                .build();

        recordingSegmentRepository.save(segment);
        return segment.getId();
    }

    public void stopAgentRecording(Long segmentId) {
        // Tìm segment đang active
        RecordingSegment activeSegment = recordingSegmentRepository
                .findById(segmentId)
                .orElseThrow(() -> new RuntimeException("No active recording segment found"));

        // Tìm full session recording
        com.example.backend.model.Recording fullSessionRecording = activeSegment.getRecording();

        // Tính offset time kết thúc
        double endOffsetSeconds = Duration.between(fullSessionRecording.getStartedAt(), LocalDateTime.now())
                .toSeconds();

        // Update segment
        activeSegment.setSegmentEndTime(LocalDateTime.now());
        activeSegment.setEndOffsetSeconds(endOffsetSeconds);

        recordingSegmentRepository.save(activeSegment);
    }


    public void deleteLocalRecording(String recordingId){
        try{
            openVidu.deleteRecording(recordingId);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Error in deleting local record: " + e.getMessage());
        }
        return;
    }
}
