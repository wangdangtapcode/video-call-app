package com.example.backend.repository;

import com.example.backend.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgentRepository extends JpaRepository<Agent, Long> {
    Optional<Agent> findByUserId(Long userId);
}
