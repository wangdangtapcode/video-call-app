# WebSocket Configuration Guide

## Cấu hình và sử dụng WebSocket

### 1. **Cấu hình cơ bản**

WebSocket đã được cấu hình để **tự động kết nối khi app start** và duy trì kết nối xuyên suốt phiên làm việc.

```jsx
// App.jsx
import { AppProvider } from "./context/AppProvider";

function App() {
  return <AppProvider>{/* Your app components */}</AppProvider>;
}
```

### 2. **Sử dụng WebSocket ở bất cứ đâu**

#### **Gửi message:**

```jsx
import { useWebSocket } from "../websocket/WebSocketContext";

const MyComponent = () => {
  const { sendMessage, isConnected } = useWebSocket();

  const handleSendMessage = () => {
    if (isConnected) {
      sendMessage("/app/hello", { message: "Hello World!" });
    }
  };
};
```

#### **Subscribe events:**

```jsx
import { useWebSocket } from "../websocket/WebSocketContext";
import { useEffect } from "react";

const MyComponent = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe("/topic/notifications", (data) => {
        console.log("Received:", data);
      });

      return () => {
        unsubscribe("/topic/notifications");
      };
    }
  }, [isConnected]);
};
```

### 3. **Hooks chuyên dụng**

#### **Notifications:**

```jsx
import { useWebSocketNotification } from "../hooks/useWebSocketNotification";

const UserDashboard = () => {
  const { user } = useUser();

  useWebSocketNotification(user?.id, (notification) => {
    // Xử lý notification
    console.log("New notification:", notification);
  });
};
```

#### **Call Events:**

```jsx
import { useWebSocketCall } from "../hooks/useWebSocketNotification";

const CallComponent = () => {
  const { user } = useUser();

  const { sendCallRequest, acceptCall, rejectCall, endCall } = useWebSocketCall(
    user?.id,
    {
      onCallRequest: (data) => console.log("Incoming call:", data),
      onCallAccepted: (data) => console.log("Call accepted:", data),
      onCallRejected: (data) => console.log("Call rejected:", data),
      onCallEnded: (data) => console.log("Call ended:", data),
    }
  );

  const handleStartCall = () => {
    sendCallRequest(agentId, sessionId);
  };
};
```

### 4. **Tính năng nâng cao**

- ✅ **Auto-reconnect**: Tự động kết nối lại khi mất kết nối
- ✅ **Connection status**: Theo dõi trạng thái kết nối real-time
- ✅ **Re-subscription**: Tự động subscribe lại sau khi reconnect
- ✅ **Error handling**: Xử lý lỗi và retry logic
- ✅ **Page visibility**: Reconnect khi tab active lại
- ✅ **Memory cleanup**: Tự động cleanup khi component unmount

### 5. **Connection Status**

```jsx
const { connectionStatus, isConnected } = useWebSocket();

// connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
// isConnected: boolean
```

### 6. **Best Practices**

1. **Luôn check `isConnected` trước khi send message**
2. **Sử dụng custom hooks cho logic phức tạp**
3. **Cleanup subscriptions trong useEffect return**
4. **Sử dụng try-catch khi parse JSON message**

### 7. **Backend Routes cần thiết**

```java
// WebSocket configuration
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins("*").withSockJS();
    }
}
```

Cấu hình này đảm bảo WebSocket hoạt động ổn định và có thể sử dụng ở bất cứ đâu trong ứng dụng!
