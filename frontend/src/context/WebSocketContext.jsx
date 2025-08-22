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
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const roleSubscriptionsRef = useRef(new Map());
  const connectionAttempts = useRef(0);
  const isConnectingRef = useRef(false);

  const WEBSOCKET_URL = "http://localhost:8081/ws";
  const RECONNECT_DELAY = 3000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const getRoleChannels = useCallback((role, userId) => {
    const baseChannels = [`/user/${userId}/topic/support-updates`];

    switch (role) {
      case "USER":
        return [...baseChannels, "/topic/users/status-changes"];
      case "AGENT":
        return [...baseChannels];
      case "ADMIN":
        return [...baseChannels, "/topic/users/status-changes"];
      default:
        return baseChannels;
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    if (stompClientRef.current) {
      try {
        stompClientRef.current.deactivate();
      } catch (error) {
        console.warn("Error deactivating STOMP client:", error);
      }
      stompClientRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback((token = null, userData = null) => {
    // Prevent multiple concurrent connections
    if (isConnectingRef.current) {
      console.log("Already connecting, skipping duplicate connection attempt");
      return;
    }

    // Cleanup existing connection
    if (stompClientRef.current?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    isConnectingRef.current = true;
    cleanupConnection();

    if (userData) {
      setUserRole(userData.role);
      setUserId(userData.id);
    }

    setConnectionStatus("connecting");
    console.log(
      "Connecting to WebSocket...",
      token ? "with JWT token" : "without token"
    );

    try {
      const connectionUrl = token
        ? `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}`
        : WEBSOCKET_URL;

      const client = new Client({
        webSocketFactory: () => new SockJS(connectionUrl),
        debug: (str) => console.log("STOMP Debug:", str),
        reconnectDelay: 0, // Disable auto-reconnect, handle manually
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

        onConnect: (frame) => {
          console.log("✅ WebSocket connected successfully!");
          setIsConnected(true);
          setConnectionStatus("connected");
          connectionAttempts.current = 0;
          isConnectingRef.current = false;
          stompClientRef.current = client;

          if (userData) {
            subscribeToRoleChannels(userData.role, userData.id);
          }
          resubscribeAll();
        },

        onDisconnect: (frame) => {
          console.log("❌ WebSocket disconnected");
          setIsConnected(false);
          setConnectionStatus("disconnected");
          isConnectingRef.current = false;
          scheduleReconnect();
        },

        onStompError: (frame) => {
          console.error("❌ STOMP protocol error:", frame);
          setIsConnected(false);
          setConnectionStatus("error");
          isConnectingRef.current = false;
          scheduleReconnect();
        },

        onWebSocketError: (event) => {
          console.error("❌ WebSocket error:", event);
          setIsConnected(false);
          setConnectionStatus("error");
          isConnectingRef.current = false;
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
          isConnectingRef.current = false;

          // Only auto-reconnect for unexpected closes
          if (event.code !== 1000) {
            // 1000 = normal closure
            scheduleReconnect();
          }
        },
      });

      client.activate();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus("error");
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (connectionAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      setConnectionStatus("failed");
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, connectionAttempts.current); // Exponential backoff
    connectionAttempts.current++;

    console.log(
      `Scheduling reconnection attempt ${connectionAttempts.current} in ${delay}ms`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
      if (userData.token && userData.user) {
        connect(userData.token, userData.user);
      }
    }, delay);
  }, [connect]);

  const subscribeToRoleChannels = useCallback(
    (role, userId) => {
      if (!stompClientRef.current?.connected) {
        console.warn(
          "Cannot subscribe to role channels: WebSocket not connected"
        );
        return;
      }

      // Clear existing role subscriptions
      roleSubscriptionsRef.current.forEach((subscription) => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn("Error unsubscribing from role channel:", error);
        }
      });
      roleSubscriptionsRef.current.clear();

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

    subscriptionsRef.current.set(topic, callback);

    if (!stompClientRef.current?.connected) {
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
      if (!stompClientRef.current?.connected) {
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
            "user-id": userId?.toString(),
          },
        });

        console.log(`📤 Message sent to ${destination}`);
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
      }
    },
    [userId, userRole]
  );

  const resubscribeAll = useCallback(() => {
    // Re-subscribe manual subscriptions
    subscriptionsRef.current.forEach((callback, topic) => {
      if (stompClientRef.current?.connected) {
        try {
          stompClientRef.current.subscribe(topic, (message) => {
            try {
              const data = JSON.parse(message.body);
              callback(data);
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
              callback(message.body);
            }
          });
        } catch (error) {
          console.error(`Error resubscribing to ${topic}:`, error);
        }
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

    cleanupConnection();

    setIsConnected(false);
    setConnectionStatus("disconnected");
    setUserRole(null);
    setUserId(null);
    subscriptionsRef.current.clear();
    roleSubscriptionsRef.current.clear();
    connectionAttempts.current = 0;
  }, [cleanupConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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
      client: stompClientRef.current,
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
