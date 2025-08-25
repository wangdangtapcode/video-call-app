import { useState } from 'react';

export const SupportRequestModal = ({ request, onAccept, onReject, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(request.id);
      onClose();
    } catch (error) {
      alert('❌ Lỗi khi chấp nhận yêu cầu: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(request.id);
      onClose();
    } catch (error) {
      alert('❌ Lỗi khi từ chối yêu cầu: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-100">
          {/* <div className="absolute top-6 right-6">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div> */}
          
          <div className="text-center">

            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Yêu cầu hỗ trợ mới
            </h3>

          </div>
        </div>

        {/* User Info */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
                {request.user?.fullName ? request.user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {request.user?.fullName || request.user?.email || 'Anonymous User'}
              </h4>
            </div>
          </div>

          {/* Action Question */}
          <div className="text-center mb-6">
            <p className="text-gray-700 text-lg font-medium mb-2">
              Bạn có muốn hỗ trợ user này không?
            </p>
            <p className="text-gray-500 text-sm">
              Nếu chấp nhận, cả hai bạn sẽ được chuyển đến phòng video call
            </p>
          </div>

        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
         
            
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Từ chối  
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Chấp nhận
                  </>
                )}
              </button>
        </div>
      </div>
    </div>
  );
};
