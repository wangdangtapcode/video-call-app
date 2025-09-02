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
  const [isInitialized, setIsInitialized] = useState(false);

  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const roleSubscriptionsRef = useRef(new Map());
  const connectionAttempts = useRef(0);
  const isConnectingRef = useRef(false);
  const lastConnectParamsRef = useRef(null);
  const autoReconnectEnabledRef = useRef(true);
  const componentMountedRef = useRef(true);

  const WEBSOCKET_URL = "http://localhost:8081/ws";
  const RECONNECT_DELAY = 3000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const getRoleChannels = useCallback((role, userId) => {
    const baseChannels = [`/user/${userId}/topic/support-updates`];

    switch (role) {
      case "USER":
        return [...baseChannels, "/topic/users/status-changes", `/topic/${userId}/force-logout`];
      case "AGENT":
        return [...baseChannels, `/topic/${userId}/force-logout`];
      case "ADMIN":
        return [...baseChannels, "/topic/users/status-changes"];
      default:
        return baseChannels;
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stompClientRef.current) {
      try {
        // Đóng tất cả subscriptions trước khi deactivate
        roleSubscriptionsRef.current.forEach((subscription) => {
          try {
            subscription.unsubscribe();
          } catch (error) {
            console.warn("Error unsubscribing during cleanup:", error);
          }
        });
        roleSubscriptionsRef.current.clear();

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

    // Kiểm tra component có còn mounted không
    if (!componentMountedRef.current) {
      console.log("Component unmounted, skipping connection");
      return;
    }

    isConnectingRef.current = true;
    cleanupConnection();

    // Lưu parameters để auto-reconnect
    lastConnectParamsRef.current = { token, userData };

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
          // Kiểm tra component có còn mounted không
          if (!componentMountedRef.current) {
            console.log("Component unmounted, closing connection");
            client.deactivate();
            return;
          }

          console.log("✅ WebSocket connected successfully!");
          setIsConnected(true);
          setConnectionStatus("connected");
          connectionAttempts.current = 0;
          isConnectingRef.current = false;
          stompClientRef.current = client;
          setIsInitialized(true);

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
          
          // Chỉ auto-reconnect nếu component còn mounted và auto-reconnect được enable
          if (componentMountedRef.current && autoReconnectEnabledRef.current) {
            scheduleReconnect();
          }
        },

        onStompError: (frame) => {
          console.error("❌ STOMP protocol error:", frame);
          setIsConnected(false);
          setConnectionStatus("error");
          isConnectingRef.current = false;
          
          if (componentMountedRef.current && autoReconnectEnabledRef.current) {
            scheduleReconnect();
          }
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

          // Only auto-reconnect for unexpected closes và khi component còn mounted
          if (event.code !== 1000 && componentMountedRef.current && autoReconnectEnabledRef.current) {
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
    // Không reconnect nếu component đã unmount hoặc auto-reconnect bị disable
    if (!componentMountedRef.current || !autoReconnectEnabledRef.current) {
      console.log("Reconnect skipped: component unmounted or auto-reconnect disabled");
      return;
    }

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
      // Kiểm tra lại trước khi reconnect
      if (!componentMountedRef.current || !autoReconnectEnabledRef.current) {
        return;
      }

      // Sử dụng last connect params hoặc lấy từ sessionStorage
      let token, userData;
      
      if (lastConnectParamsRef.current) {
        token = lastConnectParamsRef.current.token;
        userData = lastConnectParamsRef.current.userData;
      } else {
        const storedData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        if (storedData.token && storedData.user) {
          token = storedData.token;
          userData = storedData.user;
        }
      }

      if (token && userData) {
        connect(token, userData);
      } else {
        console.log("No valid token/userData found for reconnection");
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

    if (data === "FORCE_LOGOUT" || data.type === "FORCE_LOGOUT") {
      console.warn("🚨 FORCE_LOGOUT received!");
      localStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      window.location.href = "/login";
    }

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
    // Disable auto-reconnect khi disconnect thủ công
    autoReconnectEnabledRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    cleanupConnection();

    setIsConnected(false);
    setConnectionStatus("disconnected");
    setUserRole(null);
    setUserId(null);
    setIsInitialized(false);
    subscriptionsRef.current.clear();
    roleSubscriptionsRef.current.clear();
    connectionAttempts.current = 0;
    lastConnectParamsRef.current = null;
  }, [cleanupConnection]);

  // Auto-reconnect với stored credentials khi component mount
  useEffect(() => {
    componentMountedRef.current = true;
    autoReconnectEnabledRef.current = true;

    // Tự động connect nếu có credentials trong sessionStorage
    const tryAutoConnect = () => {
      const storedData = JSON.parse(sessionStorage.getItem("userData") || "{}");
      if (storedData.token && storedData.user && !isConnected && !isConnectingRef.current) {
        console.log("Auto-connecting with stored credentials...");
        connect(storedData.token, storedData.user);
      }
    };

    // Delay nhỏ để đảm bảo component đã mount hoàn toàn
    const autoConnectTimer = setTimeout(tryAutoConnect, 100);

    return () => {
      clearTimeout(autoConnectTimer);
    };
  }, []); // Chỉ chạy khi component mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      autoReconnectEnabledRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  // Listen for page visibility changes để reconnect khi user quay lại tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && componentMountedRef.current) {
        // User quay lại tab, kiểm tra connection
        if (!isConnected && !isConnectingRef.current && autoReconnectEnabledRef.current) {
          const storedData = JSON.parse(sessionStorage.getItem("userData") || "{}");
          if (storedData.token && storedData.user) {
            console.log("Page visible again, attempting to reconnect...");
            connectionAttempts.current = 0; // Reset attempts
            connect(storedData.token, storedData.user);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isConnected, connect]);

  // Helper function để enable/disable auto-reconnect
  const setAutoReconnect = useCallback((enabled) => {
    autoReconnectEnabledRef.current = enabled;
    console.log(`Auto-reconnect ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  // Function để force reconnect (reset attempts và connect ngay)
  const forceReconnect = useCallback(() => {
    if (isConnectingRef.current) {
      console.log("Already connecting, skipping force reconnect");
      return;
    }

    connectionAttempts.current = 0;
    autoReconnectEnabledRef.current = true;
    
    const storedData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (storedData.token && storedData.user) {
      console.log("Force reconnecting...");
      cleanupConnection();
      setTimeout(() => connect(storedData.token, storedData.user), 100);
    }
  }, [connect, cleanupConnection]);

  const value = useMemo(
    () => ({
      isConnected,
      connectionStatus,
      userRole,
      userId,
      isInitialized,
      sendMessage,  
      subscribe,
      unsubscribe,
      connect,
      disconnect,
      setAutoReconnect,
      forceReconnect,
      client: stompClientRef.current,
    }),
    [
      isConnected,
      connectionStatus,
      userRole,
      userId,
      isInitialized,
      sendMessage,
      subscribe,
      unsubscribe,
      connect,
      disconnect,
      setAutoReconnect,
      forceReconnect,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;