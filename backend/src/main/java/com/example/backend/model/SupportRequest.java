package com.example.backend.model;

import com.example.backend.enums.ResponseStatus;
import com.example.backend.enums.SupportRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "support_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SupportRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SupportRequestStatus status = SupportRequestStatus.WAITING;

    @Enumerated(EnumType.STRING)
    private ResponseStatus response;

    // User yêu cầu hỗ trợ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_support_request_user"))
    private User user;

    // Agent được ghép (null cho đến khi matched)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = true, foreignKey = @ForeignKey(name = "fk_support_request_agent"))
    private User agent;

    // Preferred agent ID (cho trường hợp user chọn agent cụ thể)
    @Column(name = "preferred_agent_id", nullable = true)
    private Long preferredAgentId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "timeout_at")
    private LocalDateTime timeoutAt;

    // Helper methods
    public boolean isWaiting() {
        return this.status == SupportRequestStatus.WAITING;
    }

    public boolean isMatched() {
        return this.status == SupportRequestStatus.MATCHED;
    }

    public boolean isCompleted() {
        return this.status == SupportRequestStatus.COMPLETED;
    }

    public boolean isTimeout() {
        return this.status == SupportRequestStatus.TIMEOUT;
    }

    public boolean isQuickSupport() {
        return "quick_support".equals(this.type);
    }

    public boolean isChooseAgent() {
        return "choose_agent".equals(this.type);
    }

    public boolean hasPreferredAgent() {
        return this.preferredAgentId != null;
    }
}
