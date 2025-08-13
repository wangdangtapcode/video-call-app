import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const AgentDashboard = () => {
    const { user, logout, isLoading, isInitialized, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const [agentStatus, setAgentStatus] = useState('online');
    const [activeRequests, setActiveRequests] = useState([]);
    const [stats, setStats] = useState({
        totalRequests: 24,
        completedToday: 8,
        avgResponseTime: '2.5 phút',
        rating: 4.8
    });

    // Mock support requests data
    const supportRequests = [
        {
            id: 1,
            user: 'Nguyễn Văn A',
            type: 'Kỹ thuật',
            priority: 'high',
            message: 'Không thể kết nối video call',
            time: '2 phút trước',
            status: 'waiting'
        },
        {
            id: 2,
            user: 'Trần Thị B',
            type: 'Tài khoản',
            priority: 'medium',
            message: 'Quên mật khẩu đăng nhập',
            time: '5 phút trước',
            status: 'in-progress'
        },
        {
            id: 3,
            user: 'Lê Văn C',
            type: 'Thanh toán',
            priority: 'low',
            message: 'Hỗ trợ nâng cấp tài khoản',
            time: '10 phút trước',
            status: 'waiting'
        }
    ];

    // Redirect to login if not authenticated (only after initialization)
    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                navigate("/login");
            } else if (user?.role?.name !== 'AGENT') {
                // Redirect non-agents to appropriate dashboard
                navigate("/");
            } else {
                window.scrollTo(0, 0);
            }
        }
    }, [isInitialized, isAuthenticated, user, navigate]);

    // Show loading while initializing
    if (isLoading || !isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

    const handleStatusChange = (newStatus) => {
        setAgentStatus(newStatus);
        // TODO: Update status on backend
        console.log('Agent status changed to:', newStatus);
    };

    const handleAcceptRequest = (requestId) => {
        // TODO: Accept support request
        console.log('Accepted request:', requestId);
    };

    const handleJoinVideoCall = (requestId) => {
        // TODO: Join video call with user
        console.log('Joining video call for request:', requestId);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'busy': return 'bg-red-500';
            case 'away': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'online': return 'Trực tuyến';
            case 'busy': return 'Bận';
            case 'away': return 'Vắng mặt';
            case 'offline': return 'Ngoại tuyến';
            default: return 'Không xác định';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
                                Chào mừng, Agent {user.fullName}! 👨‍💻
                            </h1>
                            <p className="text-gray-600 mt-1">Bảng điều khiển hỗ trợ khách hàng</p>
                        </div>
                        
                        {/* Status Control */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(agentStatus)}`}></div>
                                <span className="text-sm font-medium text-gray-900">{getStatusText(agentStatus)}</span>
                            </div>
                            
                            <select
                                value={agentStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="online">Trực tuyến</option>
                                <option value="busy">Bận</option>
                                <option value="away">Vắng mặt</option>
                                <option value="offline">Ngoại tuyến</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Tổng yêu cầu</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.totalRequests}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Hoàn thành hôm nay</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.completedToday}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Thời gian phản hồi</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.avgResponseTime}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Đánh giá</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.rating}/5</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support Requests */}
                <div className="bg-white rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Yêu cầu hỗ trợ</h2>
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                                {supportRequests.length} yêu cầu
                            </span>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {supportRequests.map((request) => (
                            <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-medium text-gray-900">{request.user}</h3>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                                                {request.priority === 'high' ? 'Cao' : request.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {request.type}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-2">{request.message}</p>
                                        <p className="text-sm text-gray-500">{request.time}</p>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3 ml-4">
                                        {request.status === 'waiting' && (
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Chấp nhận
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleJoinVideoCall(request.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span>Video Call</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};