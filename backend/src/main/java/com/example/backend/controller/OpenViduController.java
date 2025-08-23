package com.example.backend.controller;

import com.example.backend.dto.response.RecordingDTO;
import com.example.backend.service.OpenViduService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    @PostMapping(value = "/recording/start/{sessionId}")
    public ResponseEntity<?> startRecording(@PathVariable String sessionId,@RequestParam Long agentId,@RequestParam Long userId) {
        try {
            RecordingDTO recordingDTO = openViduService.startRecording(sessionId, agentId, userId);
            return ResponseEntity.ok(recordingDTO);
        } catch (Exception e) {
            System.out.println("Error in start recording: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/recording/stop/{recordingId}")
    public ResponseEntity<?> stopRecording(@PathVariable String recordingId){
        try {
            RecordingDTO recordingDTO = openViduService.stopRecording(recordingId);
            return ResponseEntity.ok(recordingDTO);
        } catch (Exception e){
            System.out.println("Error in stop recording: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
