import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useWebSocket } from "../context/WebSocketContext";
import { VideoCallRoom } from "../components/VideoCall/VideoCallRoom";
import axios from "axios";

export const VideoCall = () => {
  console.log("VIDEO CALL PAGE RENDERED");
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useUser();
  const { isConnected } = useWebSocket();

  const [callData, setCallData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login");
      return;
    }

    if (!requestId) {
      setError("Request ID không hợp lệ");
      setIsLoading(false);
      return;
    }

    loadCallData();
  }, [requestId, isAuthenticated, user, navigate]);

  const loadCallData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch call/request data from backend
      const response = await axios.get(
        `http://localhost:8081/api/support/requests/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Không thể tải thông tin cuộc gọi");
      }
      console.log("Call data loaded:", response.data);
      const data = response.data;
      setCallData(data);
    } catch (error) {
      console.error("Error loading call data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, token]);

  const handleCallEnd = () => {
    // Navigate back to appropriate dashboard
    if (user.role?.name === "AGENT") {
      navigate("/agent");
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Đang khởi tạo cuộc gọi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-600 text-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-2">Lỗi</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={handleCallEnd}
              className="bg-white text-red-600 px-4 py-2 rounded hover:bg-gray-100"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>Không tìm thấy thông tin cuộc gọi</p>
          <button
            onClick={handleCallEnd}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoCallRoom
      requestId={requestId}
      callData={callData}
      userRole={user.role?.name}
      userId={user.id}
      userName={user.fullName || user.email}
      onCallEnd={handleCallEnd}
      isWebSocketConnected={isConnected}
    />
  );
};
