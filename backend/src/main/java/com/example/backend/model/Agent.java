package com.example.backend.model;

import com.example.backend.converter.DurationToIntervalConverter;
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
    @Convert(converter = DurationToIntervalConverter.class)
    private Duration totalCallTime = Duration.ZERO;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_agents_user"))
    private User user;
}
