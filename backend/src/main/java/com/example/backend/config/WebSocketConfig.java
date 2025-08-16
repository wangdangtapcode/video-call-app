package com.example.backend.config;

import com.example.backend.websocket.StompChannelInterceptor;
import com.example.backend.websocket.UserHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocket
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private UserHandshakeInterceptor userHandshakeInterceptor;

    @Autowired
    private StompChannelInterceptor stompChannelInterceptor;

    @Autowired
    private TaskScheduler taskScheduler;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enhanced config cho @stomp/stompjs compatibility
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] { 10000, 10000 }) // 10s heartbeat
                .setTaskScheduler(taskScheduler);

        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");

        // Enable preserved user destinations for better reliability
        config.setPreservePublishOrder(true);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(userHandshakeInterceptor)
                .withSockJS()
                .setClientLibraryUrl("https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js")
                .setStreamBytesLimit(512 * 1024) // 512KB
                .setHttpMessageCacheSize(1000)
                .setDisconnectDelay(30 * 1000); // 30s disconnect delay

        // Add native WebSocket endpoint for better performance
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(userHandshakeInterceptor);
    }

//    @Override
//    public void configureClientInboundChannel(ChannelRegistration registration) {
//        registration.interceptors(stompChannelInterceptor);
//    }
}