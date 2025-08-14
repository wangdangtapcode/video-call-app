import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

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

  const connect = () => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      console.log('WebSocket already connected');
      return;
    }

    setConnectionStatus('connecting');
    console.log('Connecting to WebSocket...');

    try {
      const socket = new SockJS(WEBSOCKET_URL);
      const client = Stomp.over(socket);
      
      // Disable debug logs in production
      client.debug = process.env.NODE_ENV === 'development' ? console.log : () => {};

      client.connect(
        {}, // headers
        () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          setConnectionStatus('connected');
          stompClientRef.current = client;
          
          // Re-subscribe to all topics after reconnection
          resubscribeAll();
        },
        (error) => {
          console.error('WebSocket connection error:', error);
          setIsConnected(false);
          setConnectionStatus('error');
          
          // Auto-reconnect after delay
          scheduleReconnect();
        }
      );

      // Handle connection lost
      socket.onclose = () => {
        console.log('WebSocket connection lost');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        scheduleReconnect();
      };

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

    if (stompClientRef.current) {
      stompClientRef.current.disconnect(() => {
        console.log('WebSocket disconnected');
      });
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
      connect();
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
      stompClientRef.current.send(destination, {}, message);
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

  // Connect when component mounts
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Handle page visibility change (reconnect when page becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

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
