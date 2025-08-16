package com.example.backend.service;

import com.example.backend.model.SupportRequest;
import com.example.backend.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

        @Autowired
        private WebSocketBroadcastService webSocketBroadcastService;

        /**
         * Notify user và agent khi request được matched
         */
        public void notifyRequestMatched(SupportRequest request) {
                // Notify user
                webSocketBroadcastService.broadcastToUser(
                                request.getUser().getId(),
                                "request_matched",
                                "Đã tìm thấy agent! Agent " + request.getAgent().getFullName() + " sẽ hỗ trợ bạn.",
                                request);

                // Notify agent
                webSocketBroadcastService.broadcastToUser(
                                request.getAgent().getId(),
                                "request_assigned",
                                "Bạn đã được phân công hỗ trợ user " + request.getUser().getFullName(),
                                request);

                System.out.println("Notified user " + request.getUser().getId() + " and agent "
                                + request.getAgent().getId()
                                + " about match");
        }

        public void notifyUserChooseAgent(SupportRequest request) {

                // Notify agent
                webSocketBroadcastService.broadcastToUser(
                                request.getAgent().getId(),
                                "request_assigned",
                                "Bạn nhận được yêu cầu hỗ trợ từ user " + request.getUser().getFullName(),
                                request);

                System.out.println("Notified agent " + request.getAgent().getId() + " about match");
        }

        /**
         * Notify user khi request timeout
         */
        public void notifyRequestTimeout(SupportRequest request, String reason) {
                webSocketBroadcastService.broadcastToUser(
                                request.getUser().getId(),
                                "request_timeout",
                                reason,
                                request);

                System.out.println("Notified user " + request.getUser().getId() + " about timeout: " + reason);
        }

        /**
         * Notify khi request completed
         */
        public void notifyRequestCompleted(SupportRequest request) {
                // Notify both user and agent
                webSocketBroadcastService.broadcastToUser(
                                request.getUser().getId(),
                                "request_completed",
                                "Yêu cầu hỗ trợ đã hoàn thành",
                                request);

                if (request.getAgent() != null) {
                        webSocketBroadcastService.broadcastToUser(
                                        request.getAgent().getId(),
                                        "request_completed",
                                        "Yêu cầu hỗ trợ đã hoàn thành",
                                        request);
                }
        }

        /**
         * Notify user khi agent chấp nhận yêu cầu
         */
        public void notifyAgentAccepted(SupportRequest request) {
                webSocketBroadcastService.broadcastToUser(
                                request.getUser().getId(),
                                "agent_accepted",
                                "Agent " + request.getAgent().getFullName()
                                                + " đã chấp nhận hỗ trợ bạn! Chuẩn bị kết nối video call...",
                                request);

                System.out.println("Notified user " + request.getUser().getId() + " that agent accepted the request");
        }

        /**
         * Notify user khi agent từ chối yêu cầu
         */
        public void notifyAgentRejected(SupportRequest request, String reason) {
                String message = "Agent " + request.getAgent().getFullName() + " đã từ chối yêu cầu hỗ trợ.";
                if (reason != null && !reason.trim().isEmpty()) {
                        message += " Lý do: " + reason;
                }
                message += " Hệ thống sẽ tìm agent khác cho bạn.";

                webSocketBroadcastService.broadcastToUser(
                                request.getUser().getId(),
                                "agent_rejected",
                                message,
                                request);

                System.out.println("Notified user " + request.getUser().getId() + " that agent rejected the request: "
                                + reason);
        }
}