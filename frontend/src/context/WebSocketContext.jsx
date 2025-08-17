import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // 'connecting', 'connected', 'disconnected', 'error'
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const roleSubscriptionsRef = useRef(new Map());

  const WEBSOCKET_URL = "http://localhost:8081/ws";
  const RECONNECT_DELAY = 3000; // 3 seconds

  const getRoleChannels = useCallback((role, userId) => {
    const baseChannels = [
      `/user/${userId}/topic/support-updates`, // Private support notifications
      // `/user/${userId}/topic/notifications`, // Private general notifications
    ];

    switch (role) {
      case "USER":
        return [
          ...baseChannels,
          "/topic/agents/status-changes", // Agent online/offline updates
          // "/topic/user/notifications", // Global user notifications
          // "/topic/system/announcements", // System announcements
        ];

      case "AGENT":
        return [
          ...baseChannels,
          // "/topic/agent/notifications", // Global agent notifications,          // Other agents' status changes
          // "/topic/support-updates", // Support queue updates
        ];

      case "ADMIN":
        return [
          ...baseChannels,
          // "/topic/admin/notifications", // Admin notifications
          // "/topic/system/monitoring", // System monitoring
          // "/topic/agents/status-changes", // All agent status
          // "/topic/support/analytics", // Support analytics
        ];

      default:
        return baseChannels;
    }
  }, []);

  const connect = (token = null, userData = null) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      console.log("WebSocket already connected");
      return;
    }

    if (userData) {
      setUserRole(userData.role.name);
      setUserId(userData.id);
    }

    setConnectionStatus("connecting");
    console.log(
      "Connecting to WebSocket...",
      token ? "with JWT token" : "without token"
    );

    try {
      // Include JWT token in connection URL for authentication
      const connectionUrl = token
        ? `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}`
        : WEBSOCKET_URL;

      // Create new STOMP client using @stomp/stompjs
      const client = new Client({
        webSocketFactory: () => new SockJS(connectionUrl),
        debug: (str) => console.log("STOMP Debug:", str),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000, // Match backend config
        heartbeatOutgoing: 10000,

        connectHeaders: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},

        onConnect: (frame) => {
          console.log("✅ WebSocket connected successfully! Frame:", frame);
          setIsConnected(true);
          setConnectionStatus("connected");
          stompClientRef.current = client;

          if (userData) {
            subscribeToRoleChannels(
              userData.role.name,
              userData.id
            );
          }
          // Re-subscribe to all topics after reconnection
          resubscribeAll();
        },

        onDisconnect: (frame) => {
          console.log("❌ WebSocket disconnected. Frame:", frame);
          setIsConnected(false);
          setConnectionStatus("disconnected");
        },

        onStompError: (frame) => {
          console.error("❌ STOMP protocol error:", frame);
          setIsConnected(false);
          setConnectionStatus("error");
          scheduleReconnect();
        },

        onWebSocketError: (event) => {
          console.error("❌ WebSocket error:", event);
          setIsConnected(false);
          setConnectionStatus("error");
        },

        onWebSocketClose: (event) => {
          console.log(
            "WebSocket connection closed. Code:",
            event.code,
            "Reason:",
            event.reason
          );
          setIsConnected(false);
          setConnectionStatus("disconnected");
          scheduleReconnect();
        },
      });

      // Activate the client
      client.activate();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus("error");
      scheduleReconnect();
    }
  };

  const subscribeToRoleChannels = useCallback(
    (role, userId) => {
      if (!stompClientRef.current || !stompClientRef.current.connected) {
        console.warn(
          "Cannot subscribe to role channels: WebSocket not connected"
        );
        return;
      }

      const channels = getRoleChannels(role, userId);
      console.log(`Auto-subscribing to ${role} channels:`, channels);

      channels.forEach((topic) => {
        try {
          const subscription = stompClientRef.current.subscribe(
            topic,
            (message) => {
              handleRoleChannelMessage(topic, message);
            }
          );

          roleSubscriptionsRef.current.set(topic, subscription);
          console.log(`✅ Auto-subscribed to: ${topic}`);
        } catch (error) {
          console.error(`❌ Failed to auto-subscribe to ${topic}:`, error);
        }
      });
    },
    [getRoleChannels]
  );

  const handleRoleChannelMessage = useCallback((topic, message) => {
    try {
      const data = JSON.parse(message.body);

      // Emit custom event for role-based messages
      const customEvent = new CustomEvent("roleChannelMessage", {
        detail: {
          topic,
          type: data.type,
          data: data.data || data,
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(customEvent);
    } catch (error) {
      console.error("Error parsing role channel message:", error);
    }
  }, []);

  const subscribe = useCallback((topic, callback) => {
    if (!topic || !callback) {
      console.error("Topic and callback are required for subscription");
      return null;
    }

    // Store subscription for auto-resubscribe
    subscriptionsRef.current.set(topic, callback);

    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn(
        "WebSocket not connected. Subscription will be attempted when connected."
      );
      return null;
    }

    try {
      const subscription = stompClientRef.current.subscribe(
        topic,
        (message) => {
          try {
            const data = JSON.parse(message.body);
            callback(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            callback(message.body);
          }
        }
      );

      return subscription;
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      return null;
    }
  }, []);

  const unsubscribe = useCallback((topic) => {
    subscriptionsRef.current.delete(topic);
  }, []);

  const sendMessage = useCallback(
    (destination, body, targetRole = null, targetUser = null) => {
      if (!stompClientRef.current || !stompClientRef.current.connected) {
        console.warn("WebSocket not connected. Cannot send message.");
        return false;
      }

      try {
        const messageBody = {
          ...body,
          senderId: userId,
          senderRole: userRole,
          targetRole,
          targetUser,
          timestamp: Date.now(),
        };

        const message =
          typeof messageBody === "string"
            ? messageBody
            : JSON.stringify(messageBody);

        stompClientRef.current.publish({
          destination,
          body: message,
          headers: {
            "user-role": userRole,
            "user-id": userId,
          },
        });

        console.log(`📤 Message sent to ${destination}:`, messageBody);
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
      }
    },
    [userId, userRole]
  );

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log("Attempting to reconnect...");
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          connect(parsed.token, parsed.user);
        } catch (e) {
          console.error("Error parsing userData for reconnection:", e);
        }
      }
    }, RECONNECT_DELAY);
  }, [connect]);

  const resubscribeAll = useCallback(() => {
    // Re-subscribe manual subscriptions
    subscriptionsRef.current.forEach((callback, topic) => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.subscribe(topic, (message) => {
          try {
            const data = JSON.parse(message.body);
            callback(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            callback(message.body);
          }
        });
      }
    });

    // Re-subscribe role-based channels
    if (userRole && userId) {
      subscribeToRoleChannels(userRole, userId);
    }
  }, [userRole, userId, subscribeToRoleChannels]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    setUserRole(null);
    setUserId(null);
    subscriptionsRef.current.clear();
    roleSubscriptionsRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      connectionStatus,
      userRole,
      userId,
      sendMessage,
      subscribe,
      unsubscribe,
      connect,
      disconnect,
      // New role-specific methods
      // sendToRole: (destination, body, targetRole) => sendMessage(destination, body, targetRole),
      // sendToUser: (destination, body, targetUserId) => sendMessage(destination, body, null, targetUserId),
      // broadcastToAll: (destination, body) => sendMessage(destination, body, 'ALL')
    }),
    [
      isConnected,
      connectionStatus,
      userRole,
      userId,
      sendMessage,
      subscribe,
      unsubscribe,
      connect,
      disconnect,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
