package com.example.backend.service;

import io.openvidu.java.client.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.HashMap;

@Service
public class OpenViduService {

    @Value("${openvidu.url}")
    private String OPENVIDU_URL;

    @Value("${openvidu.secret}")
    private String OPENVIDU_SECRET;

    private OpenVidu openVidu;

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

//            ConnectionProperties connectionProperties = propertiesBuilder.build();
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

    public void startRecording(String sessionId) {
        // TODO: Implement recording functionality
    }

    public void stopRecording(String recordingId) {
        // TODO: Implement recording functionality
    }
}
