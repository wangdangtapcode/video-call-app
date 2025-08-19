package com.example.backend.controller;

import com.example.backend.dto.response.RecordResponse;
import com.example.backend.dto.response.RecordUrlResponse;
import com.example.backend.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/record")
public class RecordController {
    @Autowired
    private RecordService recordService;

    @GetMapping
    public ResponseEntity<List<RecordResponse>> listVideos(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(recordService.listVideos(startDate, endDate));
    }

    @GetMapping("/url/{key}")
    public ResponseEntity<RecordUrlResponse> getPresignedUrl(@PathVariable String key) {
        return ResponseEntity.ok(recordService.getPresignedUrl(key));
    }
}
