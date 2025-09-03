import { useState, useRef } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";

/**
 * Custom hook để handle permission-related updates
 * Dành cho cả user và agent trong permission page
 */
export const usePermissionUpdates = () => {
  const [permissionNotifications, setPermissionNotifications] = useState([]);
  const processedNotificationIds = useRef(new Set());

  // Listen for permission cancelled notifications
  useRoleChannelListener("permission_cancelled", (data) => {
    console.log("Permission cancelled notification received:", data);

    // Tạo unique ID để tránh duplicate
    const notificationId = `${data.requestId}-${data.cancelledBy}-${data.timestamp}`;

    // Chỉ thêm nếu chưa được xử lý
    if (!processedNotificationIds.current.has(notificationId)) {
      processedNotificationIds.current.add(notificationId);
      setPermissionNotifications((prev) => [data, ...prev.slice(0, 49)]);
    } else {
      console.log("Duplicate notification ignored:", notificationId);
    }
  });
  useRoleChannelListener("call_ended", (data) => {
    console.log("Call ended notification received:", data);
    const notificationId = `${data.requestId}-${data.endedBy}-${data.timestamp}`;
    if (!processedNotificationIds.current.has(notificationId)) {
      processedNotificationIds.current.add(notificationId);
      setPermissionNotifications((prev) => [data, ...prev.slice(0, 49)]);
    } else {
      console.log("Duplicate notification ignored:", notificationId);
    }
  });

  const clearPermissionNotifications = () => {
    setPermissionNotifications([]);
    processedNotificationIds.current.clear();
  };

  return {
    permissionNotifications,
    clearPermissionNotifications,
  };
};
