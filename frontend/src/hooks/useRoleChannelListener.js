import { useEffect } from "react";
import { useWebSocket } from "../context/WebSocketContext";

export const useRoleChannelListener = (messageType, callback) => {
  const { userRole } = useWebSocket();

  useEffect(() => {
    const handleRoleMessage = (event) => {
      const { topic, type, data } = event.detail;

      if (type === messageType) {
        callback(data, topic);
      }
    };

    window.addEventListener("roleChannelMessage", handleRoleMessage);

    return () => {
      window.removeEventListener("roleChannelMessage", handleRoleMessage);
    };
  }, [messageType, callback]);
};
