package com.example.backend.service;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import com.example.backend.model.Recording;
import com.example.backend.model.RecordingStatus;
import com.example.backend.repository.RecordingRepository;
import io.openvidu.java.client.OpenVidu;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecordService {

    @Autowired
    private S3Client s3Client;
    @Autowired
    private S3Presigner s3Presigner;

    private OpenVidu openVidu;

    @Autowired
    private RecordingRepository recordingRepository;

    @Autowired
    private UserMetricsService userMetricsService;

    private String bucketName = "openvidurecord";

    public List<RecordResponse> listVideos(String startDate, String endDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        LocalDate tmpStart = null;
        LocalDate tmpEnd = null;

        if (startDate != null && !startDate.isBlank()) {
            tmpStart = LocalDate.parse(startDate, formatter);
        }
        if (endDate != null && !endDate.isBlank()) {
            tmpEnd = LocalDate.parse(endDate, formatter);
        }

        final LocalDate start = tmpStart;
        final LocalDate end = tmpEnd;

        ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .build();
        ListObjectsV2Response listRes = s3Client.listObjectsV2(listReq);

        return listRes.contents().stream()
                .filter(obj -> {
                    LocalDate modifiedDate = obj.lastModified()
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate();

                    boolean afterStart = (start == null || !modifiedDate.isBefore(start));
                    boolean beforeEnd = (end == null || !modifiedDate.isAfter(end));

                    return afterStart && beforeEnd;
                })
                .map(obj -> new RecordResponse(
                        obj.key(),
                        Paths.get(obj.key()).getFileName().toString(),
                        obj.lastModified()))
                .toList();
    }

    public RecordUrlResponse getPresignedUrl(String key) {

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofDays(7))
                .getObjectRequest(getObjectRequest)
                .build();

        return new RecordUrlResponse(s3Presigner.presignGetObject(presignRequest).url().toString());
    }

    public Recording createRecording(String recordingId, String sessionId, Long agentId, Long userId) {
        Recording recording = Recording.builder()
                .status(RecordingStatus.INIT)
                .recordingId(recordingId)
                .sessionId(sessionId)
                .agentId(agentId)
                .userId(userId)
                .build();
        return recordingRepository.save(recording);
    }

    public Recording updateRecordingDetails(String recordingId, io.openvidu.java.client.Recording openViduRecording) {
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if (recordingOpt.isPresent()) {
            Recording recording = recordingOpt.get();
            recording.setDuration(openViduRecording.getDuration());
            recording.setFileSize(openViduRecording.getSize());
            recording.setStatus(RecordingStatus.STOPPED);
            return recordingRepository.save(recording);
        }
        throw new RuntimeException("Recording not found " + recordingId);
    }

    public Recording updateRecordingStatus(String recordingId, RecordingStatus status) {
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if (recordingOpt.isPresent()) {
            Recording recording = recordingOpt.get();
            recording.setStatus(status);
            switch (status) {
                case STARTED:
                    recording.setStartedAt(LocalDateTime.now());
                    break;
                case STOPPED:
                    recording.setStoppedAt(LocalDateTime.now());
                    break;
                case INIT:
                case UPLOADED:
                case FAILED:
                    // No specific time update for these statuses
                    break;
            }
            return recordingRepository.save(recording);
        }
        throw new RuntimeException("Recording not found: " + recordingId);

    }

    public void updateRecordingS3Info(String recordingId, String s3Key, String s3Url) {
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if (recordingOpt.isPresent()) {
            Recording recording = recordingOpt.get();
            recording.setS3Key(s3Key);
            recording.setS3Url(s3Url);
            recordingRepository.save(recording);
        }
    }

    public void uploadToS3(io.openvidu.java.client.Recording openViduRecording) {
        try {
            String recordingUrl = openViduRecording.getUrl();

            // Tạo connection với Basic Authentication
            URL url = new URL(recordingUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            // Thêm Basic Authentication header
            // OpenVidu sử dụng OPENVIDUAPP:MY_SECRET làm credentials
            String credentials = "OPENVIDUAPP:MY_SECRET";
            String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());
            connection.setRequestProperty("Authorization", "Basic " + encodedCredentials);
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);

            try (InputStream inputStream = connection.getInputStream()) {
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd--HHmmss"));
                String s3Key = String.format("recording/%s/%s/%s-%s.mp4",
                        openViduRecording.getSessionId(),
                        timestamp,
                        openViduRecording.getId(),
                        timestamp);

                // Lấy content length từ connection
                long contentLength = connection.getContentLengthLong();
                if (contentLength == -1) {
                    // Fallback nếu không get được content length
                    contentLength = openViduRecording.getSize();
                }

                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .contentType("video/mp4")
                        .metadata(Map.of(
                                "session-id", openViduRecording.getSessionId(),
                                "recording-id", openViduRecording.getId(),
                                "duration", String.valueOf(openViduRecording.getDuration()),
                                "size", String.valueOf(openViduRecording.getSize())))
                        .build();

                // Upload với content length chính xác
                s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, contentLength));

                String s3Url = getPresignedUrl(s3Key).getUrl();
                System.out.println("Successfully uploaded to S3: " + s3Url);
                updateRecordingS3Info(openViduRecording.getId(), s3Key, s3Url);

                updateRecordingStatus(openViduRecording.getId(), RecordingStatus.UPLOADED);

            } finally {
                connection.disconnect();
            }

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Failed to upload recording to S3: " + e.getMessage());
            updateRecordingStatus(openViduRecording.getId(), RecordingStatus.FAILED);
            throw new RuntimeException("Failed to upload recording to S3", e);
        }
        return;
    }

    public void deleteFile(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
    }

    // Xóa cả folder (xóa tất cả object có prefix)
    public void deleteFolder(String folderKey) {
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(folderKey)
                .build();

        ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
        List<S3Object> objects = listResponse.contents();

        if (!objects.isEmpty()) {
            DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(Delete.builder()
                            .objects(
                                    objects.stream().map(o -> ObjectIdentifier.builder().key(o.key()).build()).toList())
                            .build())
                    .build();
            s3Client.deleteObjects(deleteRequest);
        }
    }

    public RecordUrlResponse getFilePresignedUrl(String key, Duration expireDuration) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .getObjectRequest(getObjectRequest)
                .signatureDuration(expireDuration)
                .build();

        URL url = s3Presigner.presignGetObject(presignRequest).url();
        return new RecordUrlResponse(url.toString());
    }

    // Pre-signed URL cho tất cả file trong folder
    public List<RecordUrlResponse> getFolderPresignedUrls(String folderKey, Duration expireDuration) {
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(folderKey)
                .build();

        ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

        return listResponse.contents().stream()
                .filter(obj -> !obj.key().endsWith("/")) // bỏ folder giả
                .map(obj -> getFilePresignedUrl(obj.key(), expireDuration)) // trả về RecordUrlResponse trực tiếp
                .collect(Collectors.toList());
    }

    public void rating(String key, String rating, String feedback) {
        Optional<Recording> recordings = recordingRepository.findBySessionId(key);
        if (recordings.isPresent()) {
            Recording recording = recordings.get();
            recording.setRating(Integer.parseInt(rating));
            recording.setFeedback(feedback);
            recordingRepository.save(recording);
            boolean isSuccessful = rating != null && Integer.parseInt(rating) < 3 ? false : true;
            userMetricsService.updateCallCompleted(recording.getAgentId(), recording.getDuration(), isSuccessful);
            if (recording.getAgentId() != null) {
                userMetricsService.updateRating(recording.getAgentId(), Integer.parseInt(rating));
            }
            return; // Thêm return để tránh throw exception
        }
        throw new RuntimeException("Recording not found: " + key);
    }
}
