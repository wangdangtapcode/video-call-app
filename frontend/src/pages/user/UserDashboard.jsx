import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useUserSubscriptions } from "../../hooks/useUserSubscriptions";
import { useWebSocket } from "../../context/WebSocketContext";
import { useNotification } from "../../context/NotificationContext";
import { SupportRequestModal } from "../../components/SupportRequestModal";
import axios from "axios";

export const UserDashboard = () => {
  const { user, logout, isLoading, isInitialized, isAuthenticated, token } =
    useUser();
  const { isConnected } = useWebSocket();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [supportCode, setSupportCode] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentsList, setShowAgentsList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [agentToConfirm, setAgentToConfirm] = useState(null);

  // New states for quick support timer and request management
  const [isQuickSupportActive, setIsQuickSupportActive] = useState(false);
  const [quickSupportTimer, setQuickSupportTimer] = useState(0);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [isAgentSelectionDisabled, setIsAgentSelectionDisabled] =
    useState(false);

  const timerRef = useRef(null);
  const { notifications, loadOnlineAgents, onlineAgents, isLoadingAgents } =
    useUserSubscriptions();

  const { client, disconnect } = useWebSocket();

  useEffect(() => {
    if (!client?.connected) {
      console.log("WebSocket not connected, cannot subscribe to user queue");
      return;
    }

    // Subscribe tới user-specific queue
    const subscription = client.subscribe(`/topic/${user.id}/queue/force-logout`, (message) => {
          console.log("Received message:", message);

      try {
        if (message.body === "FORCE_LOGOUT") {
          console.warn("🚨 FORCE_LOGOUT received!");

          // Ngắt kết nối WebSocket
          disconnect();

          // Thông báo cho user
          alert("You have been logged out by admin.");

          logout();
        }
      } catch (err) {
        console.error("Failed to handle FORCE_LOGOUT message", err);
      }
    });

    return () => subscription.unsubscribe();
  }, [client, disconnect, navigate]);
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        navigate("/login");
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [isInitialized, isAuthenticated, navigate]);

  const prevNotificationsLength = useRef(0);

  useEffect(() => {
    if (notifications.length > prevNotificationsLength.current) {
      const newNotification = notifications[0];
      console.log("New support request update:", newNotification);

      if (newNotification?.request?.response === "ACCEPT") {
        // Stop timer if quick support was active
        if (isQuickSupportActive) {
          stopQuickSupportTimer();
        }
        addNotification({
          type: "call",
          title: "Cập nhật yêu cầu hỗ trợ",
          message: `Agent đã chấp nhận yêu cầu của bạn`,
          autoHide: true,
          duration: 2000,
        });

        setTimeout(() => {
          navigate(`/permission/${newNotification.request.id}`);
        }, 2000);
      } else if (newNotification?.request?.response === "REJECT") {
        // Stop timer and reset states if request was rejected
        if (isQuickSupportActive) {
          stopQuickSupportTimer();
        }
        setSelectedAgent(null);
        addNotification({
          type: "call",
          title: "Cập nhật yêu cầu hỗ trợ",
          message: `Agent đã từ chối yêu cầu của bạn`,
          autoHide: false,
        });
      } else if (newNotification?.type === "request_timeout") {
        // Stop timer and reset states if request timed out
        if (isQuickSupportActive) {
          stopQuickSupportTimer();
        }
        setSelectedAgent(null);
        addNotification({
          type: "warning",
          title: "Cập nhật yêu cầu hỗ trợ",
          message: newNotification.message,
          autoHide: false,
        });
      } else if (newNotification?.type === "request_matched") {
        if(isQuickSupportActive){
          handleRequestMatched();
        }
        addNotification({
          type: "success",
          title: "Cập nhật yêu cầu hỗ trợ",
          message: newNotification.message,
          autoHide: false,
        });
        
      }
    }
    prevNotificationsLength.current = notifications.length;
  }, [notifications, addNotification]);

  // Timer management functions
  const startQuickSupportTimer = () => {
    setSelectedAgent(null);
    setShowConfirmModal(false);
    setAgentToConfirm(null);
    setShowAgentsList(false);
    setIsQuickSupportActive(true);
    setIsAgentSelectionDisabled(true);
    setQuickSupportTimer(0);

    timerRef.current = setInterval(() => {
      setQuickSupportTimer((prev) => prev + 1);
    }, 1000);
  };
  const handleRequestMatched = () => {
    if(timerRef.current){
      clearInterval(timerRef.current);
    }
    
  };

  const stopQuickSupportTimer = () => {
    setIsQuickSupportActive(false);
    setIsAgentSelectionDisabled(false);
    setQuickSupportTimer(0);
    setCurrentRequestId(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Get estimated wait time message
  const getEstimatedWaitMessage = (seconds) => {
    if (seconds < 30) {
      return "Đang tìm agent có sẵn...";
    } else if (seconds < 60) {
      return "Ước tính thời gian chờ: 1-2 phút";
    } else if (seconds < 120) {
      return "Ước tính thời gian chờ: 2-3 phút";
    } else {
      return "Thời gian chờ có thể lâu hơn dự kiến";
    }
  };

  const handleQuickSupport = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8081/api/support/requests",
        {
          type: "quick_support",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const result = response.data;
        console.log("create request quick support", result);
        setCurrentRequestId(result.id); // Store request ID for cancellation

        // Start timer
        startQuickSupportTimer();

        addNotification({
          type: "success",
          title: "Yêu cầu đã gửi",
          message: "Đã gửi yêu cầu hỗ trợ nhanh! Đang tìm agent có sẵn...",
          duration: 3000,
        });

        console.log("Support request created:", result);
      } else {
        const error = response.data;
        addNotification({
          type: "error",
          title: "Lỗi gửi yêu cầu",
          message: error.message || "Không thể gửi yêu cầu",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error creating support request:", error);
      addNotification({
        type: "error",
        title: "Lỗi kết nối",
        message: "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.",
        duration: 5000,
      });
    }
  };

  const handleCancelQuickSupport = async () => {
    if (!currentRequestId) return;

    try {
      const response = await axios.delete(
        `http://localhost:8081/api/support/requests/${currentRequestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        stopQuickSupportTimer();

        addNotification({
          type: "info",
          title: "Đã hủy yêu cầu",
          message: "Yêu cầu hỗ trợ nhanh đã được hủy",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error cancelling support request:", error);
      addNotification({
        type: "error",
        title: "Lỗi hủy yêu cầu",
        message: "Không thể hủy yêu cầu. Vui lòng thử lại.",
        duration: 3000,
      });
    }
  };

  const handleJoinWithCode = () => {
    if (!supportCode.trim()) {
      addNotification({
        type: "warning",
        title: "Thiếu thông tin",
        message: "Vui lòng nhập mã cuộc họp!",
        duration: 3000,
      });
      return;
    }
    addNotification({
      type: "info",
      title: "Tham gia cuộc họp",
      message: `Tham gia cuộc họp với mã: ${supportCode}`,
      duration: 3000,
    });
  };

  const handleShowAgentsList = () => {
    if (isAgentSelectionDisabled) return;

    setShowAgentsList(true);
    loadOnlineAgents();
    setTimeout(() => {
      document.getElementById("agents-list")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  const handleAgentClick = (agent) => {
    if (isAgentSelectionDisabled) return;

    setAgentToConfirm(agent);
    setShowConfirmModal(true);
  };

  const confirmAgentSelection = async () => {
    if (!agentToConfirm) return;

    try {
      setIsQuickSupportActive(false);
      const response = await axios.post(
        "http://localhost:8081/api/support/requests",
        {
          type: "choose_agent",
          agentId: agentToConfirm.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const result = response.data;
        setSelectedAgent(agentToConfirm);
        setShowConfirmModal(false);
        setAgentToConfirm(null);
        setCurrentRequestId(result.id);

        addNotification({
          type: "success",
          title: "Yêu cầu đã gửi",
          message: `Đã gửi yêu cầu hỗ trợ đến ${getAgentDisplayName(
            agentToConfirm
          )}! Vui lòng chờ agent xác nhận.`,
          duration: 5000,
        });

        console.log("Support request created:", result);
      } else {
        setIsQuickSupportActive(false); // Re-enable if failed
        const error = response.data;
        addNotification({
          type: "error",
          title: "Lỗi gửi yêu cầu",
          message: error.message || "Không thể gửi yêu cầu",
          duration: 5000,
        });
      }
    } catch (error) {
      setIsQuickSupportActive(false); // Re-enable if failed
      console.error("Error creating support request:", error);
      addNotification({
        type: "error",
        title: "Lỗi kết nối",
        message: "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.",
        duration: 5000,
      });
    }
  };

  const cancelAgentSelection = () => {
    setShowConfirmModal(false);
    setAgentToConfirm(null);
  };

  const getAgentInitials = (agent) => {
    if (agent.fullName) {
      return agent.fullName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (agent.email) {
      return agent.email.charAt(0).toUpperCase();
    }
    return "A";
  };

  const getAgentDisplayName = (agent) => {
    return agent.fullName || agent.email || `Agent ${agent.id}`;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-lg text-gray-600">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-normal text-gray-800 mb-4">
            Tính năng gọi video dành cho thành viên
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hỗ trợ ở mọi nơi với VideoCall
          </p>
        </div>

        {/* Quick Support Timer Display */}
        {isQuickSupportActive && (
          <div className="mb-8">
            <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-blue-800 font-medium">
                  Đang tìm agent...
                </span>
              </div>

              <div className="text-3xl font-bold text-blue-900 mb-2">
                {formatTimer(quickSupportTimer)}
              </div>

              <p className="text-blue-700 text-sm mb-4">
                {getEstimatedWaitMessage(quickSupportTimer)}
              </p>

              <button
                onClick={handleCancelQuickSupport}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Hủy yêu cầu
              </button>
            </div>
          </div>
        )}

        {/* Quick Support & Agent Selection - Same Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <button
            onClick={handleQuickSupport}
            disabled={isQuickSupportActive || isAgentSelectionDisabled || selectedAgent}
            className={`px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 transition-colors duration-200 shadow-lg ${
              isQuickSupportActive || isAgentSelectionDisabled || selectedAgent
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {isQuickSupportActive
              ? "Đang tìm agent..."
              : "Yêu cầu hỗ trợ nhanh"}
          </button>

          <button
            onClick={handleShowAgentsList}
            disabled={isQuickSupportActive || isAgentSelectionDisabled}
            className={`px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 transition-all duration-200 ${
              isQuickSupportActive || isAgentSelectionDisabled
                ? "bg-gray-100 text-gray-400 border-2 border-gray-300 cursor-not-allowed"
                : "bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 hover:border-blue-700"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Chọn agent hỗ trợ
          </button>
        </div>

        {/* Disabled State Message
        {(isQuickSupportActive || isAgentSelectionDisabled) &&
          !isQuickSupportActive && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <svg
                  className="w-4 h-4 text-orange-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-orange-800 text-sm">
                  Đã có yêu cầu hỗ trợ đang chờ xử lý
                </span>
              </div>
            </div>
          )} */}

        {/* Selected Agent Display */}
        {selectedAgent && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-green-50 px-6 py-3 rounded-full border border-green-200">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                {getAgentInitials(selectedAgent)}
              </div>
              <span className="text-green-800 font-medium">
                Agent được chọn: {getAgentDisplayName(selectedAgent)}
              </span>
              <button
                onClick={() => setSelectedAgent(null)}
                className="ml-3 text-green-600 hover:text-green-800"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Online Agents List */}
        {showAgentsList && (
          <div id="agents-list" className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Agents đang online
                {!isLoadingAgents && (
                  <span className="ml-2 text-lg text-gray-500">
                    ({onlineAgents.length})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {isConnected ? "Kết nối" : "Mất kết nối"}
                  </span>
                </div>

                <button
                  onClick={loadOnlineAgents}
                  disabled={isLoadingAgents || isAgentSelectionDisabled}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isAgentSelectionDisabled
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  title="Làm mới danh sách"
                >
                  <svg
                    className={`w-5 h-5 ${
                      isLoadingAgents ? "animate-spin" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {isLoadingAgents && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <svg
                    className="animate-spin h-6 w-6 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-gray-600">Đang tải danh sách agents...</p>
                </div>
              </div>
            )}

            {!isLoadingAgents && onlineAgents.length === 0 && showAgentsList && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Không có agent nào đang online
                </h3>
              </div>
            )}

            {!isLoadingAgents && onlineAgents.length > 0 && showAgentsList && (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {onlineAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`group relative p-6 rounded-lg shadow-sm border transition-all duration-200 ${
                      isAgentSelectionDisabled
                        ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                    }`}
                    onClick={() =>
                      !isAgentSelectionDisabled && handleAgentClick(agent)
                    }
                    title={
                      isAgentSelectionDisabled
                        ? "Đang có yêu cầu khác"
                        : `Click để chọn ${getAgentDisplayName(agent)}`
                    }
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-semibold mb-3 transition-transform duration-200 ${
                          !isAgentSelectionDisabled
                            ? "group-hover:scale-105"
                            : ""
                        }`}
                      >
                        {getAgentInitials(agent)}
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 text-center mb-1">
                        {getAgentDisplayName(agent)}
                      </h3>
                    </div>

                    {/* Tooltip - only show if not disabled */}
                    {!isAgentSelectionDisabled && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 group-hover:translate-y-1">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-64">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                              {getAgentInitials(agent)}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">
                                {getAgentDisplayName(agent)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Email:</span>
                              <span className="text-gray-900 font-medium">
                                {agent.email || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">
                                Tổng số yêu cầu hỗ trợ:
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600 font-medium">
                                  {agent.totalCalls || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Đánh giá:</span>
                              <span className="text-gray-900 font-medium">
                                {agent.rating || "0.0"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-blue-600 text-center font-medium">
                              Click để chọn agent này
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                          <div className="border-8 border-transparent border-t-white" />
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-gray-200" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && agentToConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="relative p-6 pb-4">
                <div className="absolute top-6 right-6">
                  <button
                    onClick={cancelAgentSelection}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {getAgentInitials(agentToConfirm)}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Xác nhận chọn {getAgentDisplayName(agentToConfirm)}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Agent sẽ nhận được thông báo và có thể bắt đầu hỗ trợ bạn
                    ngay lập tức
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-4 bg-gray-50 rounded-b-2xl">
                <button
                  onClick={cancelAgentSelection}
                  className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmAgentSelection}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  Xác nhận chọn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
