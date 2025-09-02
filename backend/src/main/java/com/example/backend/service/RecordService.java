package com.example.backend.service;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import com.example.backend.dto.response.RecordingResponse;
import com.example.backend.dto.response.TimeSeriesPoint;
import com.example.backend.exception.BusinessException;
import com.example.backend.mapper.RecordingMapper;
import com.example.backend.model.Recording;
import com.example.backend.model.RecordingStatus;
import com.example.backend.model.User;
import com.example.backend.repository.RecordingRepository;
import com.example.backend.repository.UserRepository;
import io.openvidu.java.client.OpenVidu;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.ResponseTransformer;
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
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    private RecordingMapper recordingMapper;

    @Autowired
    private UserRepository userRepository;

    private String bucketName = "openvidurecord";


    public List<TimeSeriesPoint> getCallStats(String interval,
                                              LocalDateTime start,
                                              LocalDateTime end) {
        List<Object[]> rows = recordingRepository.countByInterval(interval, start, end);
        return rows.stream()
                .map(r -> new TimeSeriesPoint(
                        ((java.sql.Timestamp) r[0]).toLocalDateTime(),
                        ((Number) r[1]).longValue(),
                        ((Double) r[2]).doubleValue()
                ))
                .toList();
    }

    public Page<RecordingResponse> getRecords(Long agentId,
                                              Long userId,
                                              String startDate,
                                              String endDate,
                                              Pageable pageable) {

        // 1. Parse date
        LocalDateTime start = null;
        LocalDateTime end = null;

        if (startDate != null && !startDate.isEmpty()) {
            // parse yyyy-MM-dd -> LocalDate -> LocalDateTime 00:00:00
            start = LocalDate.parse(startDate).atStartOfDay();
        }
        if (endDate != null && !endDate.isEmpty()) {
            // parse yyyy-MM-dd -> LocalDate -> LocalDateTime 23:59:59
            end = LocalDate.parse(endDate).atTime(23, 59, 59);
        }

        // 2. Lấy tất cả recordings với filter (nếu dùng Specification hoặc method name)
        Page<Recording> recordings = recordingRepository.findByFilters(agentId, userId, start, end, pageable);

        // 3. Lấy tất cả userId + agentId trong page, fetch 1 lần
        Set<Long> userIds = recordings.stream()
                .flatMap(r -> Stream.of(r.getUserId(), r.getAgentId()))
                .collect(Collectors.toSet());

        Map<Long, User> usersMap = userRepository.findAllById(userIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        // 4. Map Recording -> RecordingResponse
        return recordings.map(recording -> {
            User user = usersMap.get(recording.getUserId());
            User agent = usersMap.get(recording.getAgentId());

            if (user == null) throw BusinessException.userNotFound(recording.getUserId());
            if (agent == null) throw BusinessException.userNotFound(recording.getAgentId());

            RecordingResponse recordingResponse = recordingMapper.toResponse(recording);
            recordingResponse.setUserFullName(user.getFullName());
            recordingResponse.setAgentFullName(agent.getFullName());

            return recordingResponse;
        });
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

    public Recording createRecording(String recordingId,String sessionId, Long agentId, Long userId){
        Recording recording = Recording.builder()
                .status(RecordingStatus.INIT)
                .recordingId(recordingId)
                .sessionId(sessionId)
                .agentId(agentId)
                .userId(userId)
                .build();
        return recordingRepository.save(recording);
    }

    public Recording updateRecordingDetails(String recordingId, io.openvidu.java.client.Recording openViduRecording){
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if (recordingOpt.isPresent()){
            Recording recording = recordingOpt.get();
            recording.setDuration(openViduRecording.getDuration());
            recording.setFileSize(openViduRecording.getSize());
            recording.setStatus(RecordingStatus.STOPPED);
            return recordingRepository.save(recording);
        }
        throw new RuntimeException("Recording not found " + recordingId);
    }

    public Recording updateRecordingStatus(String recordingId, RecordingStatus status){
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if(recordingOpt.isPresent()){
            Recording recording = recordingOpt.get();
            recording.setStatus(status);
            switch (status){
                case STARTED:
                    recording.setStartedAt(LocalDateTime.now());
                    break;
                case STOPPED:
                    recording.setStoppedAt(LocalDateTime.now());
                    break;
            }
            return recordingRepository.save(recording);
        }
        throw new RuntimeException("Recording not found: " + recordingId);

    }

    public void updateRecordingS3Info(String recordingId, String s3Key, String s3Url){
        Optional<Recording> recordingOpt = recordingRepository.findByRecordingId(recordingId);
        if(recordingOpt.isPresent()){
            Recording recording = recordingOpt.get();
            recording.setS3Key(s3Key);
            recording.setS3Url(s3Url);
            recordingRepository.save(recording);
        }
    }

    public void uploadToS3(io.openvidu.java.client.Recording openViduRecording){
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

            try(InputStream inputStream = connection.getInputStream()){
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
                                "size", String.valueOf(openViduRecording.getSize())
                        ))
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

        } catch (Exception e){
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
                            .objects(objects.stream().map(o -> ObjectIdentifier.builder().key(o.key()).build()).toList())
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

}
