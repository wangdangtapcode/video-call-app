import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAgentSubscriptions } from "../../hooks/useAgentSubscriptions";
import { useWebSocket } from "../../context/WebSocketContext";
import { useNotification } from "../../context/NotificationContext";
import { SupportRequestModal } from "../../components/SupportRequestModal";
import axios from "axios";
export const AgentDashboard = () => {
  const { user, userMetric, isLoading, isInitialized, isAuthenticated, token,updateStatus } =
    useUser();
  const { isConnected } = useWebSocket();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { supportRequests } = useAgentSubscriptions();

  const [userMetrics, setUserMetrics] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const prevRequestsLength = useRef(0);
  // Redirect to login if not authenticated (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (user?.role !== "AGENT") {
        // Redirect non-agents to appropriate dashboard
        navigate("/");
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [isInitialized, isAuthenticated, user, navigate]);
  // Phát hiện request mới và hiển thị modal
  useEffect(() => {
    if (supportRequests.length > prevRequestsLength.current) {
      const newestRequest = supportRequests[0]; // Giả sử mảng sắp xếp newest first
      console.log("New support request update:", newestRequest);
      setCurrentRequest(newestRequest.request);
      setShowModal(true);
    }
    prevRequestsLength.current = supportRequests.length;
  }, [supportRequests]);

  // Fetch user metrics
  useEffect(() => {
    const fetchUserMetrics = async () => {
      if (user?.id && token) {
        try {
          setIsLoadingMetrics(true);
          const response = await axios.get(
            `http://localhost:8081/api/user-metrics/user/${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setUserMetrics(response.data);
        } catch (error) {
          console.error("Error fetching user metrics:", error);
          addNotification({
            type: 'error',
            title: 'Lỗi tải dữ liệu',
            message: 'Không thể tải thống kê hiệu suất. Sử dụng dữ liệu mặc định.',
            duration: 5000
          });
          // Set default metrics if error
          setUserMetrics({
            totalCalls: 0,
            successfulCalls: 0,
            rating: 0.0,
            averageResponseTime: 0.0,
            formattedAverageResponseTime: "0s",
            successRate: 0.0
          });
        } finally {
          setIsLoadingMetrics(false);
        }
      }
    };

    fetchUserMetrics();
  }, [user?.id, token, addNotification]);

  // Refresh metrics manually
  const refreshMetrics = async () => {
    if (user?.id && token) {
      try {
        setIsLoadingMetrics(true);
        const response = await axios.get(
          `http://localhost:8081/api/user-metrics/user/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUserMetrics(response.data);
        addNotification({
          type: 'success',
          title: 'Thành công',
          message: 'Đã cập nhật thống kê hiệu suất.',
          duration: 3000
        });
      } catch (error) {
        console.error("Error refreshing user metrics:", error);
        addNotification({
          type: 'error',
          title: 'Lỗi',
          message: 'Không thể cập nhật thống kê. Vui lòng thử lại.',
          duration: 5000
        });
      } finally {
        setIsLoadingMetrics(false);
      }
    }
  };

  // Show loading while initializing
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

  // If initialized but no user, redirect will happen via useEffect
  if (!user) {
    return null;
  }

  const handleStatusChange = async (newStatus) => {
    console.log("Agent status changing to:", newStatus);
    await updateStatus(newStatus);
  };
  const handleRejectRequest = async (requestId) => {
    try {
      const response = await axios.post(
        `http://localhost:8081/api/support/requests/${requestId}/respond`,
        {
          action: "reject",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        console.log("Request rejected successfully");
        setShowModal(false);
        setCurrentRequest(null);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await axios.post(
        `http://localhost:8081/api/support/requests/${requestId}/respond`,
        {
          action: "accept",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        console.log("Request accepted successfully");
        setShowModal(false);
        setCurrentRequest(null);
        // Navigate to permission page first
        navigate(`/permission/${requestId}`);
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      addNotification({
        type: 'error',
        title: 'Lỗi chấp nhận yêu cầu',
        message: 'Có lỗi xảy ra khi chấp nhận yêu cầu. Vui lòng thử lại.',
        duration: 5000
      });
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentRequest(null);
  };
  const handleJoinVideoCall = (requestId) => {
    // TODO: Join video call with user
    console.log("Joining video call for request:", requestId);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ONLINE":
        return "bg-green-500";
      case "BUSY":
        return "bg-red-500";
      case "OFFLINE":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case "ONLINE":
        return "Trực tuyến";
      case "BUSY":
        return "Bận";
      case "OFFLINE":
        return "Ngoại tuyến";
      default:
        return "Không xác định";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">
                Chào mừng, {user.fullName} !
              </h1>
              <p className="text-gray-600 mt-1">
                Bảng điều khiển hỗ trợ khách hàng
              </p>
            </div>

            {/* Status Control */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  Trạng thái:
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(
                    user.status
                  )}`}
                ></div>
                <span className="text-sm font-medium text-gray-900">
                  {getStatusText(user.status)}
                </span>
                {!isConnected && (
                  <span className="text-xs text-red-500">(Mất kết nối)</span>
                )}
              </div>

              <select
                value={user.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={!isConnected}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="ONLINE">Trực tuyến</option>
                <option value="BUSY">Bận</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Thống kê hiệu suất</h2>
          <button
            onClick={refreshMetrics}
            disabled={isLoadingMetrics}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 mr-2 ${isLoadingMetrics ? 'animate-spin' : ''}`}
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
            {isLoadingMetrics ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Calls Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Tổng cuộc gọi
                </p>
                {isLoadingMetrics ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold text-gray-900">
                    {userMetrics?.totalCalls || 0}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Tỷ lệ thành công
                </p>
                {isLoadingMetrics ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold text-gray-900">
                    {userMetrics?.successRate ? `${userMetrics.successRate.toFixed(1)}%` : '0.0%'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Response Time Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Thời gian phản hồi
                </p>
                {isLoadingMetrics ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold text-gray-900">
                    {userMetrics?.averageResponseTime 
                      ? userMetrics.averageResponseTime < 60 
                        ? `${Math.round(userMetrics.averageResponseTime)}s`
                        : `${Math.round(userMetrics.averageResponseTime / 60)}m ${Math.round(userMetrics.averageResponseTime % 60)}s`
                      : '0s'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đánh giá</p>
                {isLoadingMetrics ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {userMetrics?.rating ? userMetrics.rating.toFixed(1) : '0.0'}/5
                    </p>
                    <div className="flex ml-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (userMetrics?.rating || 0)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        {!isLoadingMetrics && userMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Call Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Thống kê cuộc gọi
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cuộc gọi thành công:</span>
                  <span className="font-semibold text-green-600">
                    {userMetrics.successfulCalls || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cuộc gọi thất bại:</span>
                  <span className="font-semibold text-red-600">
                    {userMetrics.failedCalls || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Thời lượng trung bình:</span>
                  <span className="font-semibold text-gray-900">
                    {userMetrics.averageCallDuration 
                      ? `${Math.round(userMetrics.averageCallDuration / 60)}m ${Math.round(userMetrics.averageCallDuration % 60)}s`
                      : '0m 0s'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng thời gian:</span>
                  <span className="font-semibold text-gray-900">
                    {userMetrics.totalCallTime 
                      ? `${Math.floor(userMetrics.totalCallTime / 3600)}h ${Math.floor((userMetrics.totalCallTime % 3600) / 60)}m`
                      : '0h 0m'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Chi tiết đánh giá
              </h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const ratingKey = `${stars === 1 ? 'one' : stars === 2 ? 'two' : stars === 3 ? 'three' : stars === 4 ? 'four' : 'five'}StarRatings`;
                  const count = userMetrics[ratingKey] || 0;
                  const total = userMetrics.totalRatings || 1;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  
                  return (
                    <div key={stars} className="flex items-center space-x-3">
                      <div className="flex items-center w-12">
                        <span className="text-sm font-medium">{stars}</span>
                        <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t">
                  <span className="text-sm text-gray-600">
                    Tổng đánh giá: {userMetrics.totalRatings || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showModal && currentRequest && (
        <SupportRequestModal
          request={currentRequest}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
