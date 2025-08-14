import { useEffect, useRef } from "react";
import { useWebSocket } from "../context/WebSocketContext";

/**
 * Custom hook để subscribe notifications cho user
 * @param {string} userId - ID của user
 * @param {function} onNotification - Callback khi nhận notification
 */
export const useWebSocketNotification = (userId, onNotification) => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  const subscriptionRef = useRef(null);
  const topicRef = useRef(null);

  useEffect(() => {
    if (!userId || !isConnected) return;

    const topic = `/topic/user/${userId}/notifications`;
    topicRef.current = topic;

    // Subscribe to user notifications
    subscriptionRef.current = subscribe(topic, (notification) => {
      console.log("Received notification:", notification);
      if (onNotification) {
        onNotification(notification);
      }
    });

    return () => {
      if (topicRef.current) {
        unsubscribe(topicRef.current);
      }
    };
  }, [userId, isConnected, subscribe, unsubscribe, onNotification]);

  return {
    isConnected,
    topic: topicRef.current,
  };
};

/**
 * Custom hook để subscribe call events
 * @param {string} userId - ID của user
 * @param {object} callbacks - Object chứa các callback functions
 * @param {function} callbacks.onCallRequest - Khi có call request
 * @param {function} callbacks.onCallAccepted - Khi call được accept
 * @param {function} callbacks.onCallRejected - Khi call bị reject
 * @param {function} callbacks.onCallEnded - Khi call kết thúc
 */
export const useWebSocketCall = (userId, callbacks = {}) => {
  const { subscribe, unsubscribe, sendMessage, isConnected } = useWebSocket();
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (!userId || !isConnected) return;

    const topics = [
      {
        topic: `/topic/user/${userId}/call-request`,
        callback: callbacks.onCallRequest,
      },
      {
        topic: `/topic/user/${userId}/call-accepted`,
        callback: callbacks.onCallAccepted,
      },
      {
        topic: `/topic/user/${userId}/call-rejected`,
        callback: callbacks.onCallRejected,
      },
      {
        topic: `/topic/user/${userId}/call-ended`,
        callback: callbacks.onCallEnded,
      },
    ];

    // Subscribe to all call-related topics
    topics.forEach(({ topic, callback }) => {
      if (callback) {
        subscribe(topic, callback);
        subscriptionsRef.current.push(topic);
      }
    });

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach((topic) => {
        unsubscribe(topic);
      });
      subscriptionsRef.current = [];
    };
  }, [userId, isConnected, subscribe, unsubscribe, callbacks]);

  // Helper functions to send call-related messages
  const sendCallRequest = (agentId, sessionId) => {
    return sendMessage("/app/call/request", {
      userId,
      agentId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  };

  const acceptCall = (callId) => {
    return sendMessage("/app/call/accept", {
      callId,
      userId,
      timestamp: new Date().toISOString(),
    });
  };

  const rejectCall = (callId, reason) => {
    return sendMessage("/app/call/reject", {
      callId,
      userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  };

  const endCall = (callId) => {
    return sendMessage("/app/call/end", {
      callId,
      userId,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    isConnected,
    sendCallRequest,
    acceptCall,
    rejectCall,
    endCall,
  };
};
