package com.example.backend.model;

import com.example.backend.enums.CallStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "calls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private CallStatus status;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Long duration;

    private Boolean isRecorded = false;

    private Integer userRating;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @OneToMany(mappedBy = "call", cascade = CascadeType.ALL)
    private List<CallRecord> callRecords;

    @OneToMany(mappedBy = "call", cascade = CascadeType.ALL)
    private List<CallMedia> callMedias;
}
