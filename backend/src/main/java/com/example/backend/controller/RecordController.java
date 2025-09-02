package com.example.backend.controller;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import com.example.backend.dto.response.S3TreeResponse;
import com.example.backend.service.RecordService;
import com.example.backend.service.S3TreeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/record")
public class RecordController {
    @Autowired
    private RecordService recordService;

    @Autowired
    private S3TreeService s3TreeService;

    @GetMapping
    public ResponseEntity<List<RecordResponse>> listVideos(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(recordService.listVideos(startDate, endDate));
    }

    @GetMapping("/url")
    public ResponseEntity<RecordUrlResponse> getPresignedUrl(@RequestParam String key) {
        return ResponseEntity.ok(recordService.getPresignedUrl(key));
    }

    @GetMapping("/tree")
    public S3TreeResponse getSubTree(
            @RequestParam(required = false, defaultValue = "") String folderKey) {
        System.out.println("FolderKey = '" + folderKey + "'");
        return s3TreeService.getSubTree(folderKey);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> delete(@RequestParam String key, @RequestParam(required = false) Boolean folder) {
        if (Boolean.TRUE.equals(folder)) {
            recordService.deleteFolder(key);
        } else {
            recordService.deleteFile(key);
        }
        return ResponseEntity.ok().body("Deleted successfully");
    }

    @GetMapping("/download")
    public ResponseEntity<?> getPresignedUrl(
            @RequestParam String key,
            @RequestParam(required = false) Boolean folder) {
        Duration expire = Duration.ofMinutes(10);

        if (Boolean.TRUE.equals(folder)) {
            // Trả về mảng URL nếu là folder
            return ResponseEntity.ok(recordService.getFolderPresignedUrls(key, expire));
        } else {
            // Trả về URL đơn nếu là file
            return ResponseEntity.ok(recordService.getFilePresignedUrl(key, expire));
        }
    }

    @PostMapping("/rating")
    public ResponseEntity<?> rating(@RequestBody Map<String, String> requestBody) {
        String key = requestBody.get("key");
        String rating = requestBody.get("rating");
        String feedback = requestBody.get("feedback");
        recordService.rating(key, rating, feedback);
        return ResponseEntity.ok().body("Rating successfully");
    }
}
