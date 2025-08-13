import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const UserDashboard = () => {
    const { user, logout, isLoading, isInitialized, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const [supportCode, setSupportCode] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');
    const [showAgentModal, setShowAgentModal] = useState(false);
    
    // Mock agents data
    const agents = [
        { id: 1, name: 'Nguyễn Văn A', status: 'online', expertise: 'Kỹ thuật', avatar: null },
        { id: 2, name: 'Trần Thị B', status: 'online', expertise: 'Hỗ trợ khách hàng', avatar: null },
        { id: 3, name: 'Lê Văn C', status: 'busy', expertise: 'Tài chính', avatar: null },
        { id: 4, name: 'Phạm Thị D', status: 'online', expertise: 'Bảo mật', avatar: null },
    ];
    
    useEffect(() => {
        // Chỉ chạy logic khi context đã khởi tạo xong
        if (isInitialized) {
            if (!isAuthenticated) {
                // Nếu chưa xác thực, chuyển hướng đến trang đăng nhập
                navigate("/login");
            } else {
                // NẾU ĐÃ XÁC THỰC, đảm bảo cuộn lên đầu trang
                // Hành động này sẽ ghi đè lên hành vi khôi phục vị trí cuộn của trình duyệt
                window.scrollTo(0, 0);
            }
        }
    }, [isInitialized, isAuthenticated, navigate]);
    


    const handleQuickSupport = () => {
        // TODO: Implement quick support request
        alert('Yêu cầu hỗ trợ nhanh đã được gửi!');
    };

    const handleJoinWithCode = () => {
        if (!supportCode.trim()) {
            alert('Vui lòng nhập mã cuộc họp!');
            return;
        }
        // TODO: Implement join with code
        alert(`Tham gia cuộc họp với mã: ${supportCode}`);
    };

    const handleSelectAgent = (agent) => {
        setSelectedAgent(agent);
        setShowAgentModal(false);
        // TODO: Implement agent selection
        alert(`Đã chọn agent: ${agent.name}`);
    };
    
    // Show loading while initializing or if user is not loaded yet
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

                {/* Quick Support & Agent Selection - Same Row */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                    <button
                        onClick={handleQuickSupport}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 transition-colors duration-200 shadow-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Yêu cầu hỗ trợ nhanh
                    </button>

                    <button
                        onClick={() => setShowAgentModal(true)}
                        className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 hover:border-blue-700 px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Chọn agent hỗ trợ
                    </button>
                </div>

                {/* Selected Agent Display */}
                {selectedAgent && (
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center bg-blue-50 px-4 py-2 rounded-full">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                                {selectedAgent.name.charAt(0)}
                            </div>
                            <span className="text-blue-800 font-medium">
                                Agent được chọn: {selectedAgent.name} ({selectedAgent.expertise})
                            </span>
                        </div>
                    </div>
                )}

                {/* Join with Code - Separate Row */}
                {/* <div className="flex flex-col items-center justify-center mb-12">
                    <div className="flex items-center gap-4 w-full max-w-2xl">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white flex-1">
                            <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Nhập mã cuộc họp hoặc đường link"
                                value={supportCode}
                                onChange={(e) => setSupportCode(e.target.value)}
                                className="px-4 py-4 text-lg border-none outline-none flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinWithCode()}
                            />
                        </div>
                        <button
                            onClick={handleJoinWithCode}
                            className="text-blue-600 hover:text-blue-700 font-medium text-lg px-6 py-4 hover:bg-blue-50 rounded-lg transition-colors duration-200 whitespace-nowrap"
                        >
                            Tham gia
                        </button>
                    </div>
                </div> */}

                {/* Agent Selection Modal */}
                {showAgentModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Chọn Agent Hỗ Trợ</h3>
                                    <button
                                        onClick={() => setShowAgentModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 max-h-80 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {agents.map((agent) => (
                                        <div
                                            key={agent.id}
                                            onClick={() => handleSelectAgent(agent)}
                                            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                        {agent.name.charAt(0)}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                        agent.status === 'online' ? 'bg-green-400' : 
                                                        agent.status === 'busy' ? 'bg-red-400' : 'bg-gray-400'
                                                    }`}></div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                                                    <p className="text-sm text-gray-600">{agent.expertise}</p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        agent.status === 'online' ? 'bg-green-100 text-green-800' :
                                                        agent.status === 'busy' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {agent.status === 'online' ? 'Trực tuyến' : 
                                                         agent.status === 'busy' ? 'Bận' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}