package com.example.backend.service;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RecordService {

    @Autowired
    private S3Client s3Client;
    @Autowired
    private S3Presigner s3Presigner;

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
                    boolean beforeEnd  = (end == null || !modifiedDate.isAfter(end));

                    return afterStart && beforeEnd;
                })
                .map(obj -> new RecordResponse(
                        obj.key(),
                        Paths.get(obj.key()).getFileName().toString(),
                        obj.lastModified()
                ))
                .toList();
    }


    public RecordUrlResponse getPresignedUrl(String key) {

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10))
                .getObjectRequest(getObjectRequest)
                .build();

        return new RecordUrlResponse(s3Presigner.presignGetObject(presignRequest).url().toString());
    }
}
