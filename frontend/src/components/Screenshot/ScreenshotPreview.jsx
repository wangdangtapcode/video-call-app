import React, { useState } from "react";
import { X } from "lucide-react";

const ScreenshotPreview = ({
  screenshotData,
  onClose,
  isAgent,
  onEdit,
  onSend,
  imageSource = "screenshot", // 'screenshot' or 'agent'
}) => {
  const [zoom, setZoom] = useState(1); // State để hỗ trợ zoom ảnh

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3)); // Tối đa zoom 3x
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5)); // Tối thiểu zoom 0.5x

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-lg bg-black/60">
      <div className="relative bg-gray-800/90 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-gray-600/50">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-900/90 text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề */}
        <h3 className="text-white text-lg font-semibold mb-4 pt-4 px-6">
          {imageSource === "screenshot" ? "Xem trước ảnh chụp" : "Ảnh nhận từ Agent"}
        </h3>

        {/* Container cho ảnh */}
        <div className="relative w-full h-[70vh] flex items-center justify-center bg-gray-900 p-4 rounded-lg">
          <img
            src={screenshotData}
            alt={imageSource === "screenshot" ? "Screenshot Preview" : "Agent Image"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.2s ease-in-out",
            }}
          />
        </div>

        {/* Thanh công cụ */}
        <div className="flex justify-end space-x-3 mt-4 p-4 bg-gray-800/90 rounded-b-xl">
          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Phóng to"
          >
            Phóng to
          </button>
          <button
            onClick={handleZoomOut}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Thu nhỏ"
          >
            Thu nhỏ
          </button>

          {/* Nút chỉnh sửa và gửi (chỉ Agent) */}
          {isAgent && (
            <>
              {imageSource === "screenshot" && (
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

          {/* Nút tải xuống */}
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

          {/* Nút đóng */}
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