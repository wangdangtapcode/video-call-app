package com.example.backend.dto.response;


import lombok.Data;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
public class S3TreeResponse {
    private String name;                // tên file/folder
    private String key;                 // key đầy đủ trên S3
    private boolean folder;             // true nếu là folder
    private List<S3TreeResponse> children = new ArrayList<>();

    // Bổ sung các trường mới
    private long size;                  // kích thước file (folder = 0)
    private Instant lastModified;       // thời gian sửa đổi cuối cùng (folder = null)
//    private String type;
}