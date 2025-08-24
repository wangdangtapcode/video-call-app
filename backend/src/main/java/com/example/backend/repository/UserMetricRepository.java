package com.example.backend.repository;

import com.example.backend.model.UserMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMetricRepository extends JpaRepository<UserMetric, Long> {
    Optional<UserMetric> findByUserId(Long userId);

    @Query("SELECT AVG(u.rating) FROM UserMetric u")
    Double findAvgRating();

    @Query("SELECT SUM(u.totalCalls) FROM UserMetric u")
    Integer findTotalCallsToday();

    @Query("SELECT SUM(u.totalCallTime) FROM UserMetric u")
    Long findTotalCallTimeToday();
}
