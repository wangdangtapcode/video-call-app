package com.example.backend.controller;

import com.example.backend.dto.response.RecordingDTO;
import com.example.backend.service.OpenViduService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/openvidu")
public class OpenViduController {

    @Autowired
    private OpenViduService openViduService;

    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody Map<String, Object> params) {
        System.out.println("POST /api/openvidu/sessions called with params: " + params);
        try {
            ResponseEntity<?> response = openViduService.createSession(params);
            System.out.println("Session creation response: " + response.getBody());
            return response;
        } catch (Exception e) {
            System.err.println("Error in createSession: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sessions/{sessionId}/connection")
    public ResponseEntity<?> createToken(@PathVariable String sessionId, @RequestBody Map<String, Object> params) {
        System.out.println("POST /api/openvidu/sessions/" + sessionId + "/connection called with params: " + params);
        try {
            ResponseEntity<?> response = openViduService.createToken(sessionId, params);
            System.out.println("Token creation response: " + response.getBody());
            return response;
        } catch (Exception e) {
            System.err.println("Error in createToken: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Health check endpoint
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "message", "OpenVidu Controller is running",
                "timestamp", System.currentTimeMillis()));
    }

    /** Recording API **/
    @PostMapping(value = "/recording/start-auto/{sessionId}")
    public ResponseEntity<?> startRecording(@PathVariable String sessionId,@RequestParam Long agentId,@RequestParam Long userId,@RequestParam Long requestId) {
        try {
            RecordingDTO recordingDTO = openViduService.startAutoRecording(sessionId, agentId, userId, requestId);
            return ResponseEntity.ok(recordingDTO);
        } catch (Exception e) {
            System.out.println("Error in start recording: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(RecordingDTO.builder()
                            .status("ERROR")
                            .build());
        }
    }

    @PostMapping(value = "/recording/stop-auto/{recordingId}")
    public ResponseEntity<?> stopAutoRecording(@PathVariable String recordingId){
        try {
            RecordingDTO recordingDTO = openViduService.stopAutoRecording(recordingId);
            return ResponseEntity.ok(recordingDTO);
        } catch (Exception e){
            System.out.println("Error in stop recording: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(RecordingDTO.builder()
                            .status("ERROR")
                            .build());
        }
    }

    @PostMapping("/recording/agent/start/{sessionId}")
    public ResponseEntity<Map<String, Object>> startAgentRecording(@PathVariable String sessionId) {
        try {
            Long segmentId = openViduService.startAgentRecording(sessionId);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Agent recording segment started");
            response.put("sessionId", sessionId);
            response.put("timestamp", LocalDateTime.now());
            response.put("segmentId", segmentId);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("status", "ERROR");
            response.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/recording/agent/stop/{segmentId}")
    public ResponseEntity<Map<String, Object>> stopAgentRecording(
            @PathVariable Long segmentId) {
        try {
            openViduService.stopAgentRecording(segmentId);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Agent recording segment stopped");
            response.put("sessionId", segmentId);
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();

            Map<String, Object> response = new HashMap<>();
            response.put("status", "ERROR");
            response.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


}
