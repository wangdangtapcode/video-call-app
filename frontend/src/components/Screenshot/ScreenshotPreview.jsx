import React from 'react';

const ScreenshotPreview = ({
  screenshotData,
  onClose,
  isAgent,
  onEdit,
  onSend,
  imageSource = 'screenshot' // 'screenshot' or 'agent'
}) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl w-[80vw] max-w-4xl">
        <h3 className="text-white text-lg font-semibold mb-4">
          {imageSource === 'screenshot' ? 'Preview' : 'Ảnh nhận từ Agent'}
        </h3>
        <div className="bg-gray-800 p-4 rounded-lg">
          <img 
            src={screenshotData} 
            alt={imageSource === 'screenshot' ? 'Screenshot Preview' : 'Agent Image'} 
            className="max-w-full max-h-[100vh] mx-auto" 
          />
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          {isAgent && (
            <>
              {imageSource === 'screenshot' && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
              )}
              <button
                onClick={onSend}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Gửi ảnh
              </button>
            </>
          )}
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = screenshotData;
              link.download = `${imageSource}-${Date.now()}.png`;
              link.click();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tải xuống
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotPreview;