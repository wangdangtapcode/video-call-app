import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'
  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscriptionsRef = useRef(new Map());

  const WEBSOCKET_URL = 'http://localhost:8081/ws';
  const RECONNECT_DELAY = 3000; // 3 seconds

  const connect = (token = null) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      console.log('WebSocket already connected');
      return;
    }

    setConnectionStatus('connecting');
    console.log('Connecting to WebSocket...', token ? 'with JWT token' : 'without token');
    
    try {
      // Include JWT token in connection URL for authentication
      const connectionUrl = token ? `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}` : WEBSOCKET_URL;

      // Create new STOMP client using @stomp/stompjs
      const client = new Client({
        webSocketFactory: () => new SockJS(connectionUrl),
        debug: (str) => console.log('STOMP Debug:', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000, // Match backend config
        heartbeatOutgoing: 10000,
        
        connectHeaders: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        
        onConnect: (frame) => {
          console.log('✅ WebSocket connected successfully! Frame:', frame);
          setIsConnected(true);
          setConnectionStatus('connected');
          stompClientRef.current = client;
          
          // Re-subscribe to all topics after reconnection
          resubscribeAll();
        },
        
        onDisconnect: (frame) => {
          console.log('❌ WebSocket disconnected. Frame:', frame);
          setIsConnected(false);
          setConnectionStatus('disconnected');
        },
        
        onStompError: (frame) => {
          console.error('❌ STOMP protocol error:', frame);
          setIsConnected(false);
          setConnectionStatus('error');
          scheduleReconnect();
        },

        onWebSocketError: (event) => {
          console.error('❌ WebSocket error:', event);
          setIsConnected(false);
          setConnectionStatus('error');
        },

        onWebSocketClose: (event) => {
          console.log('WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
          setIsConnected(false);
          setConnectionStatus('disconnected');
          scheduleReconnect();
        }
      });

      // Activate the client
      client.activate();

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    subscriptionsRef.current.clear();
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      // Get token from localStorage for reconnection
      const userData = sessionStorage.getItem('userData');
      if (userData) {
        try {
          console.log('userData', userData);
          const parsed = JSON.parse(userData);
          connect(parsed.token);
        } catch (e) {
          console.error('Error parsing userData for reconnection:', e);
          // connect(); // Fallback to no token
        }
      } else {
        console.error('No userData found for reconnection');
        // connect();
      }
    }, RECONNECT_DELAY);
  };

  const resubscribeAll = () => {
    subscriptionsRef.current.forEach((callback, topic) => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.subscribe(topic, (message) => {
          try {
            const data = JSON.parse(message.body);
            callback(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            callback(message.body);
          }
        });
      }
    });
  };

  const sendMessage = (destination, body) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn('WebSocket not connected. Cannot send message.');
      return false;
    }

    try {
      const message = typeof body === 'string' ? body : JSON.stringify(body);
      stompClientRef.current.publish({
        destination,
        body: message
      });
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  };

  const subscribe = (topic, callback) => {
    if (!topic || !callback) {
      console.error('Topic and callback are required for subscription');
      return null;
    }

    // Store subscription for auto-resubscribe
    subscriptionsRef.current.set(topic, callback);

    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn('WebSocket not connected. Subscription will be attempted when connected.');
      return null;
    }

    try {
      const subscription = stompClientRef.current.subscribe(topic, (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          callback(message.body);
        }
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return null;
    }
  };

  const unsubscribe = (topic) => {
    subscriptionsRef.current.delete(topic);
  };

  // Auto-connect removed - will be triggered by authentication
  // useEffect(() => {
  //   connect();
  //   return () => {
  //     disconnect();
  //   };
  // }, []);

  // Handle page visibility change (reconnect when page becomes visible)
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && !isConnected) {
  //       // Get token from localStorage for reconnection
  //       const userData = localStorage.getItem('userData');
  //       if (userData) {
  //         try {
  //           const parsed = JSON.parse(userData);
  //           connect(parsed.token);
  //         } catch (e) {
  //           console.error('Error parsing userData for reconnection:', e);
  //         }
  //       }
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [isConnected]);

  const value = {
    isConnected,
    connectionStatus,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
