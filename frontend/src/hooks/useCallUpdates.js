import { useState, useRef } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";

/**
 * Custom hook để handle call-related updates
 * Dành cho cả user và agent trong video call room
 */
export const useCallUpdates = () => {
  const [callNotifications, setCallNotifications] = useState([]);
  const processedNotificationIds = useRef(new Set());

  // Listen for call ended notifications
  useRoleChannelListener("call_ended", (data) => {
    console.log("Call ended notification received:", data);

    // Tạo unique ID để tránh duplicate
    const notificationId = `${data.requestId}-${data.endedBy}-${data.timestamp}`;

    // Chỉ thêm nếu chưa được xử lý
    if (!processedNotificationIds.current.has(notificationId)) {
      processedNotificationIds.current.add(notificationId);
      setCallNotifications((prev) => [data, ...prev.slice(0, 49)]);
    } else {
      console.log("Duplicate call notification ignored:", notificationId);
    }
  });

  const clearCallNotifications = () => {
    setCallNotifications([]);
    processedNotificationIds.current.clear();
  };

  return {
    callNotifications,
    clearCallNotifications,
  };
};
