package com.example.backend.model;

import com.example.backend.converter.DurationToIntervalConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Duration;

@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String status = "offline";

    @Column
    private Double rating = 0.00;

    @Column(name = "total_calls", nullable = false)
    private Integer totalCalls = 0;

    @Column(name = "total_call_time", nullable = false)
    private Long totalCallTime = 0L;

    @OneToOne
    @JsonIgnore
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_agents_user"))
    private User user;
}
