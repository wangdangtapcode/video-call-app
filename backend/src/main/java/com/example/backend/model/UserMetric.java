package com.example.backend.model;

import com.example.backend.enums.AgentStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_metrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AgentStatus status = AgentStatus.OFFLINE;

    @Column
    private Double rating = 0.00;

    @Column(name = "total_calls", nullable = false)
    private Integer totalCalls = 0;

    @Column(name = "total_call_time", nullable = false)
    private Long totalCallTime = 0L;

    @OneToOne
    @JsonIgnore
    @JoinColumn(name = "user_id", nullable = true, foreignKey = @ForeignKey(name = "fk_user_metric_user"))
    private User user;
}
