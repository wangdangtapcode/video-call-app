import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useUser } from "../context/UserContext";

/**
 * Custom hook để quản lý Support Request Notifications
 * Handles real-time notifications cho support requests
 */
export const useSupportNotifications = () => {
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const { user, token } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Handle support request updates từ WebSocket
   */
  const handleSupportUpdate = useCallback((message) => {
    try {
      console.log("Support update received:", message);

      const { type, message: text, request, timestamp } = message;

      // Tạo notification object
      const notification = {
        id: Date.now(),
        type,
        message: text,
        request,
        timestamp: timestamp || Date.now(),
        read: false,
      };

      // Add notification to list
      setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep max 50 notifications
      setUnreadCount((prev) => prev + 1);

      // Show browser notification nếu được phép
      if (Notification.permission === "granted") {
        new Notification("Support Request Update", {
          body: text,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Error handling support update:", error);
    }
  }, []);

  /**
   * Initialize support notifications
   */
  const initializeSupportNotifications = useCallback(() => {
    if (user && user.id && token && isConnected) {
      console.log("Initializing support notifications for user:", user.id);

      // Subscribe to user-specific support updates
      subscribe(`/user/${user.id}/topic/support-updates`, handleSupportUpdate);

      // Request browser notification permission
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [user, token, isConnected, subscribe, handleSupportUpdate]);

  /**
   * Cleanup support notifications
   */
  const cleanupSupportNotifications = useCallback(() => {
    if (user && user.id) {
      unsubscribe(`/user/${user.id}/topic/support-updates`);
    }
    setNotifications([]);
    setUnreadCount(0);
  }, [user, unsubscribe]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Initialize when WebSocket connected
  useEffect(() => {
    if (user && isConnected && token) {
      initializeSupportNotifications();
    } else {
      cleanupSupportNotifications();
    }

    return () => {
      cleanupSupportNotifications();
    };
  }, [
    user,
    isConnected,
    token,
    initializeSupportNotifications,
    cleanupSupportNotifications,
  ]);

  return {
    // Data
    notifications,
    unreadCount,
    isConnected,

    // Actions
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    initializeSupportNotifications,
    cleanupSupportNotifications,
  };
};
