package com.example.backend.repository;

import com.example.backend.model.UserMetric;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserMetricRepository extends JpaRepository<UserMetric, Long> {
    Optional<UserMetric> findByUserId(Long userId);
}
