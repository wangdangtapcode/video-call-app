package com.example.backend.service;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URL;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

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
                    boolean beforeEnd = (end == null || !modifiedDate.isAfter(end));

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
