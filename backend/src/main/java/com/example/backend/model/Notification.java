package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false, foreignKey = @ForeignKey(name = "fk_notification_recipient"))
    private User recipient;

    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "sender_id", nullable = true, foreignKey =
    // @ForeignKey(name = "fk_notification_sender"))
    // private User sender;

    // Support request liên quan (nếu có)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_request_id", nullable = true, foreignKey = @ForeignKey(name = "fk_notification_support_request"))
    private SupportRequest supportRequest;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // URL để redirect (nếu có)
    @Column(name = "action_url", length = 255)
    private String actionUrl;

    // Data JSON cho thông tin bổ sung
    @Column(name = "data", columnDefinition = "TEXT")
    private String data;

    // Thời gian hết hạn (cho auto-cleanup)
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // Static factory methods for common notifications
    public static Notification createSupportRequestNotification(
            User recipient,
            SupportRequest supportRequest,
            String title,
            String message) {

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setSupportRequest(supportRequest);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setExpiresAt(LocalDateTime.now().plusDays(7)); // Auto-expire after 7 days

        return notification;
    }

    public static Notification createSystemNotification(
            User recipient,
            String title,
            String message) {

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setExpiresAt(LocalDateTime.now().plusDays(30)); // System notifications expire after 30 days

        return notification;
    }
}
