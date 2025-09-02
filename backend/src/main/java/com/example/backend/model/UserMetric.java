package com.example.backend.model;

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

    @Column
    private Double rating = 0.00;

    @Column(name = "total_calls", nullable = false)
    private Integer totalCalls = 0;

    @Column(name = "total_call_time", nullable = false)
    private Double totalCallTime = 0.00;

    @Column(name = "average_call_duration")
    private Double averageCallDuration = 0.00;

    @Column(name = "successful_calls")
    private Integer successfulCalls = 0;

    @Column(name = "failed_calls")
    private Integer failedCalls = 0;

    @Column(name = "total_accepted_calls")
    private Integer totalAcceptedCalls = 0;

    @Column(name = "total_rejected_calls")
    private Integer totalRejectedCalls = 0;

    @Column(name = "total_ratings")
    private Integer totalRatings = 0;

    @Column(name = "five_star_ratings")
    private Integer fiveStarRatings = 0;

    @Column(name = "four_star_ratings")
    private Integer fourStarRatings = 0;

    @Column(name = "three_star_ratings")
    private Integer threeStarRatings = 0;

    @Column(name = "two_star_ratings")
    private Integer twoStarRatings = 0;

    @Column(name = "one_star_ratings")
    private Integer oneStarRatings = 0;

    @Column(name = "average_response_time")
    private Double averageResponseTime = 0.00;

    @OneToOne
    @JsonIgnore
    @JoinColumn(name = "user_id", nullable = true, foreignKey = @ForeignKey(name = "fk_user_metric_user"))
    private User user;
}
