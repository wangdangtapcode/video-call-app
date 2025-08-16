import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useUser } from "../context/UserContext";

/**
 * Custom hook để handle support request notifications
 * Dành cho cả user và agent
 */
export const useSupportRequestNotifications = () => {
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const { user, token } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  /**
   * Handle support update notifications
   */
  const handleSupportUpdate = useCallback((message) => {
    try {
      console.log("Support update received:", message);

      const {
        type,
        message: notificationMessage,
        requestId,
        request,
      } = message;
      console.log("type:", type);
      console.log("notificationMessage:", notificationMessage);
      console.log("requestId:", requestId);
      console.log("request:", request);
      //   // Add to notifications list
      //   const newNotification = {
      //     id: Date.now(),
      //     type,
      //     message: notificationMessage,
      //     requestId,
      //     request,
      //     timestamp: new Date(),
      //   };

      //   setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]); // Keep last 10

      //   // Handle specific notification types
      //   switch (type) {
      //     case "request_assigned":
      //       // Agent nhận được assignment
      //       if (request) {
      //         setPendingRequests((prev) => [...prev, request]);
      //       }
      //       break;

      //     case "AGENT_ACCEPTED":
      //       // User nhận thông báo agent đã accept
      //       // Redirect to video call page
      //       setTimeout(() => {
      //         window.location.href = `/call/${requestId}`;
      //       }, 2000);
      //       break;

      //     case "REQUEST_ACCEPTED":
      //       // Agent confirmed acceptance, redirect to video call
      //       setTimeout(() => {
      //         window.location.href = `/call/${requestId}`;
      //       }, 2000);
      //       break;

      //     case "AGENT_REJECTED":
      //       // User nhận thông báo agent từ chối
      //       // Remove from pending if exists
      //       setPendingRequests((prev) =>
      //         prev.filter((req) => req.id !== requestId)
      //       );
      //       break;

      //     case "REQUEST_REJECTED":
      //       // Agent confirmed rejection
      //       setPendingRequests((prev) =>
      //         prev.filter((req) => req.id !== requestId)
      //       );
      //       break;

      //     default:
      //       console.log("Unhandled support update type:", type);
      // }
    } catch (error) {
      console.error("Error handling support update:", error);
    }
  }, []);

  /**
   * Accept support request (for agents)
   */
  const acceptRequest = useCallback(async (requestId) => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
      const token = userData.token;

      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(
        `http://localhost:8081/api/support/requests/${requestId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "accept",
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Request accepted:", result);

        // Remove from pending requests
        setPendingRequests((prev) =>
          prev.filter((req) => req.id !== requestId)
        );

        return result;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      throw error;
    }
  }, []);

  /**
   * Reject support request (for agents)
   */
  const rejectRequest = useCallback(async (requestId, reason = "") => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
      const token = userData.token;

      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(
        `http://localhost:8081/api/support/requests/${requestId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "reject",
            reason: reason,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Request rejected:", result);

        // Remove from pending requests
        setPendingRequests((prev) =>
          prev.filter((req) => req.id !== requestId)
        );

        return result;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw error;
    }
  }, []);

  /**
   * Clear notification
   */
  const clearNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Subscribe to support updates khi WebSocket connected
  useEffect(() => {
    if (isConnected && token && user) {
      console.log("Subscribing to support updates for user:", user.id);

      // Subscribe to user-specific support updates
      subscribe(`/user/${user.id}/topic/support-updates`, handleSupportUpdate);
    }

    return () => {
      if (user) {
        unsubscribe(`/user/${user.id}/topic/support-updates`);
      }
    };
  }, [isConnected, token, user, subscribe, unsubscribe, handleSupportUpdate]);

  return {
    // Data
    notifications,
    pendingRequests,

    // Actions
    acceptRequest,
    rejectRequest,
    clearNotification,
    clearAllNotifications,
  };
};
