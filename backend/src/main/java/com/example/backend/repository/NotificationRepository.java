package com.example.backend.repository;

import com.example.backend.model.Notification;
import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

//    // Tìm notifications của user
//    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
//
//    Page<Notification> findByRecipientOrderByCreatedAtDesc(User recipient, Pageable pageable);
//
//    // Tìm unread notifications của user
//    List<Notification> findByRecipientAndIsReadFalseOrderByCreatedAtDesc(User recipient);
//
//    Page<Notification> findByRecipientAndIsReadFalseOrderByCreatedAtDesc(User recipient, Pageable pageable);
//
//    // Đếm unread notifications
//    long countByRecipientAndIsReadFalse(User recipient);
//
//
//
//    // Tìm notifications liên quan đến support request
//    List<Notification> findBySupportRequestOrderByCreatedAtDesc(SupportRequest supportRequest);
//
//    // Tìm system notifications
//    @Query("SELECT n FROM Notification n WHERE n.sender IS NULL AND n.recipient = :recipient ORDER BY n.createdAt DESC")
//    List<Notification> findSystemNotificationsByRecipient(@Param("recipient") User recipient);
//
//    // Mark notifications as read
//    @Modifying
//    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.recipient = :recipient AND n.isRead = false")
//    int markAllAsReadByRecipient(@Param("recipient") User recipient, @Param("readAt") LocalDateTime readAt);
//
//    @Modifying
//    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.id IN :ids")
//    int markAsReadByIds(@Param("ids") List<Long> ids, @Param("readAt") LocalDateTime readAt);
//
//    // Tìm expired notifications
//    @Query("SELECT n FROM Notification n WHERE n.expiresAt <= :now")
//    List<Notification> findExpiredNotifications(@Param("now") LocalDateTime now);
//
//    // Delete expired notifications
//    @Modifying
//    @Query("DELETE FROM Notification n WHERE n.expiresAt <= :now")
//    int deleteExpiredNotifications(@Param("now") LocalDateTime now);
//
//    // Tìm notifications trong khoảng thời gian
//    @Query("SELECT n FROM Notification n WHERE n.recipient = :recipient AND n.createdAt >= :fromDate AND n.createdAt <= :toDate ORDER BY n.createdAt DESC")
//    List<Notification> findByRecipientAndDateRange(
//            @Param("recipient") User recipient,
//            @Param("fromDate") LocalDateTime fromDate,
//            @Param("toDate") LocalDateTime toDate);
//
//    // Recent notifications (last 24 hours)
//    @Query("SELECT n FROM Notification n WHERE n.recipient = :recipient AND n.createdAt >= :since ORDER BY n.createdAt DESC")
//    List<Notification> findRecentNotifications(@Param("recipient") User recipient, @Param("since") LocalDateTime since);
//
//    // High priority notifications (unread)
//    @Query("SELECT n FROM Notification n WHERE n.recipient = :recipient AND n.isRead = false AND n.type IN ('SUPPORT_REQUEST_ASSIGNED', 'SUPPORT_REQUEST_ACCEPTED', 'AGENT_JOINED_CALL') ORDER BY n.createdAt DESC")
//    List<Notification> findHighPriorityUnreadNotifications(@Param("recipient") User recipient);
//
//    // Bulk operations
//    @Modifying
//    @Query("DELETE FROM Notification n WHERE n.recipient = :recipient AND n.isRead = true AND n.createdAt < :beforeDate")
//    int deleteOldReadNotifications(@Param("recipient") User recipient, @Param("beforeDate") LocalDateTime beforeDate);
//
//    // Statistics
//    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient = :recipient AND n.createdAt >= :fromDate")
//    long countNotificationsSince(@Param("recipient") User recipient, @Param("fromDate") LocalDateTime fromDate);
//
//    @Query("SELECT n.type, COUNT(n) FROM Notification n WHERE n.recipient = :recipient GROUP BY n.type")
//    List<Object[]> getNotificationCountsByType(@Param("recipient") User recipient);
}
