package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_media")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MediaType mediaType;

    private String originalFileName;

    private String thumbnailPath;

    private Boolean isEdited;

    private LocalDateTime sentAt;

    private Boolean sentToUser;

    private String editDetails;

    private String mimeType;

    private String filePath;

    private Long fileSize;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;
}