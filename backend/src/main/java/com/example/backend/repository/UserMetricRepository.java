package com.example.backend.repository;

import com.example.backend.model.UserMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMetricRepository extends JpaRepository<UserMetric, Long> {
    Optional<UserMetric> findByUserId(Long userId);

    @Query("SELECT AVG(u.rating) FROM UserMetric u WHERE u.totalCalls > 0")
    Double findAvgRating();

    @Query("SELECT SUM(u.totalCalls) FROM UserMetric u")
    Integer findTotalCallsToday();

    @Query("SELECT SUM(u.totalCallTime) FROM UserMetric u")
    Long findTotalCallTimeToday();

    // Top 1 rating cao nhất
    UserMetric findTopByOrderByRatingDesc();

    // Top 1 số cuộc gọi nhiều nhất
    UserMetric findTopByOrderByTotalCallsDesc();

    // Top 1 tổng thời gian gọi lâu nhất
    UserMetric findTopByOrderByTotalCallTimeDesc();

    @Query("""
        SELECT 
            CASE 
                WHEN um.rating >= 0 AND um.rating < 1 THEN '0-1'
                WHEN um.rating >= 1 AND um.rating < 2 THEN '1-2'
                WHEN um.rating >= 2 AND um.rating < 3 THEN '2-3'
                WHEN um.rating >= 3 AND um.rating < 4 THEN '3-4'
                WHEN um.rating >= 4 AND um.rating <= 5 THEN '4-5'
            END as range,
            COUNT(um)
        FROM UserMetric um
        WHERE um.totalCalls > 0
        GROUP BY range
        ORDER BY range
    """)
    List<Object[]> getRatingDistribution();

    @Query("SELECT u FROM UserMetric u WHERE u.totalCalls > 0")
    List<UserMetric> findAllWithCalls();
}
