package com.example.backend.repository;

import com.example.backend.enums.SupportRequestStatus;
import com.example.backend.enums.UserStatus;
import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Repository
public interface SupportRequestRepository extends JpaRepository<SupportRequest, Long> {

    // Tìm support requests của user
    List<SupportRequest> findByUserOrderByCreatedAtDesc(User user);

    // Tìm support requests của agent
    List<SupportRequest> findByAgentOrderByCreatedAtDesc(User agent);

    // Tìm theo status
    List<SupportRequest> findByStatusOrderByCreatedAtDesc(SupportRequestStatus status);

    // Tìm requests đang waiting (chờ ghép)
    @Query("SELECT sr FROM SupportRequest sr WHERE sr.status = 'WAITING' ORDER BY sr.createdAt ASC")
    List<SupportRequest> findWaitingRequests();

    // Tìm requests đang waiting cho agent cụ thể
    @Query("SELECT sr FROM SupportRequest sr WHERE sr.status = 'WAITING' AND sr.preferredAgentId = :agentId ORDER BY sr.createdAt ASC")
    List<SupportRequest> findWaitingRequestsForAgent(@Param("agentId") Long agentId);

    // Check if user has active request
    @Query("SELECT COUNT(sr) > 0 FROM SupportRequest sr WHERE sr.user = :user AND sr.status IN ('WAITING', 'MATCHED')")
    boolean hasActiveRequest(@Param("user") User user);

    // Đếm active requests của agent
    @Query("SELECT COUNT(sr) FROM SupportRequest sr WHERE sr.agent = :agent AND sr.status = 'MATCHED'")
    long countActiveRequestsByAgent(@Param("agent") User agent);

    // Tìm requests timeout (quá thời gian chờ)
    @Query("SELECT sr FROM SupportRequest sr WHERE sr.status = 'WAITING' AND sr.createdAt <= :timeoutTime")
    List<SupportRequest> findTimeoutRequests(@Param("timeoutTime") LocalDateTime timeoutTime);

    // Tìm latest request của user
    Optional<SupportRequest> findFirstByUserOrderByCreatedAtDesc(User user);
}
