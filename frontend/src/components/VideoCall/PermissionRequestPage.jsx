import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

export const PermissionRequestPage = ({ onPermissionGranted, onCancel }) => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, updateStatus } = useUser();

  const [videoPermission, setVideoPermission] = useState("requesting");
  const [audioPermission, setAudioPermission] = useState("requesting");
  const [stream, setStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    // Update video element when stream changes
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.warn);
    }
  }, [stream]);

  useEffect(() => {
    // Cleanup stream when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      console.log("Requesting media permissions...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Media permissions granted successfully");

      setStream(mediaStream);
      setVideoPermission("granted");
      setAudioPermission("granted");

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Force play the video to ensure it displays
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn("Video autoplay failed:", playError);
        }
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);

      if (error.name === "NotAllowedError") {
        setError(
          "Quyền truy cập camera và microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt."
        );
        setVideoPermission("denied");
        setAudioPermission("denied");
      } else if (error.name === "NotFoundError") {
        setError(
          "Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị."
        );
      } else {
        setError("Lỗi khi truy cập thiết bị media: " + error.message);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleJoinCall = async () => {
    if (videoPermission === "granted" && audioPermission === "granted") {
      const permissionState = {
        videoEnabled: isVideoEnabled,
        audioEnabled: isAudioEnabled,
        timestamp: Date.now(),
      };
      
      try {
        // Save to sessionStorage
        sessionStorage.setItem(
          `permissions_${requestId}`,
          JSON.stringify(permissionState)
        );
        
        // Verify it was saved
        const saved = sessionStorage.getItem(`permissions_${requestId}`);
        if (!saved) {
          throw new Error("Failed to save permission state");
        }
        
        console.log("✅ Permission state saved successfully:", saved);
        
        // Stop preview stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        await updateStatus("CALLING");
        // Navigate
        if (onPermissionGranted) {
          onPermissionGranted({
            videoEnabled: isVideoEnabled,
            audioEnabled: isAudioEnabled,
            stream: stream,
          });
        } else {
          navigate(`/call/${requestId}`);
        }
        
      } catch (error) {
        console.error("❌ Error saving permission state:", error);
      }
    }
};

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (onCancel) {
      onCancel();
    } else {
      // Navigate back to dashboard
      if (user?.role === "AGENT") {
        navigate("/agent");
      } else {
        navigate("/");
      }
    }
  };

  const getUserInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full bg-white rounded-2xl overflow-hidden">
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row min-h-96">
          {/* Left Side - Video Preview */}
          <div className="flex-1 p-8 bg-white">
            {/* Video Preview */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video mb-6">
              {stream && videoPermission === "granted" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    style={{ transform: "scaleX(-1)" }} // Mirror effect like front camera
                    className={`w-full h-full object-cover ${
                      !isVideoEnabled ? "hidden" : ""
                    }`}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(console.warn);
                      }
                    }}
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl font-semibold">
                            {getUserInitials(user?.fullName || user?.email)}
                          </span>
                        </div>
                        <p className="text-gray-300">Camera đang tắt</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="text-center text-white">
                    {isRequesting ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-gray-300 mb-4">
                          Đang yêu cầu quyền truy cập...
                        </p>
                      </>
                    ) : videoPermission === "denied" ? (
                      <>
                        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <p className="text-gray-300 mb-6">
                          Quyền truy cập camera bị từ chối
                        </p>
                        {/* Permission Request Button inside video when denied */}
                        <button
                          onClick={requestPermissions}
                          disabled={isRequesting}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
                        >
                          <Video className="w-5 h-5" />
                          <span>Thử lại cấp quyền</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                          <Video className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-300 mb-6 px-4">
                          Cần cấp quyền truy cập camera và microphone để tiếp
                          tục
                        </p>
                        {/* Permission Request Button inside video */}
                        <button
                          onClick={requestPermissions}
                          disabled={isRequesting}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
                        >
                          {isRequesting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Đang yêu cầu...</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-5 h-5" />
                              <span>Cấp quyền micro và máy ảnh</span>
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 mt-3 px-4">
                          Nhấp để cấp quyền truy cập camera và microphone
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Video Controls - only show when stream is available */}
              {stream && videoPermission === "granted" && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isVideoEnabled
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    title={isVideoEnabled ? "Tắt camera" : "Bật camera"}
                  >
                    {isVideoEnabled ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <VideoOff className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isAudioEnabled
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    title={isAudioEnabled ? "Tắt micro" : "Bật micro"}
                  >
                    {isAudioEnabled ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Permission Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Camera</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      videoPermission === "granted"
                        ? "bg-green-500"
                        : videoPermission === "denied"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {videoPermission === "granted"
                      ? "Đã cấp quyền"
                      : videoPermission === "denied"
                      ? "Bị từ chối"
                      : "Cần cấp quyền"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Microphone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      audioPermission === "granted"
                        ? "bg-green-500"
                        : audioPermission === "denied"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {audioPermission === "granted"
                      ? "Đã cấp quyền"
                      : audioPermission === "denied"
                      ? "Bị từ chối"
                      : "Cần cấp quyền"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Join Controls */}
          <div className="w-full lg:w-96 p-8 bg-gray-50 flex flex-col justify-center">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Sẵn sàng tham gia?
                </h2>
                <p className="text-gray-600">
                  Kiểm tra camera và microphone trước khi tham gia cuộc gọi
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-800 font-medium text-sm">
                        Lỗi quyền truy cập
                      </p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                      <div className="mt-3 text-xs text-red-600">
                        <p className="font-medium">Hướng dẫn khắc phục:</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>
                            Nhấp vào biểu tượng khóa/camera ở thanh địa chỉ
                          </li>
                          <li>Chọn "Cho phép" cho Camera và Microphone</li>
                          <li>Tải lại trang và thử lại</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleJoinCall}
                  disabled={
                    videoPermission !== "granted" ||
                    audioPermission !== "granted"
                  }
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Users className="w-5 h-5" />
                  <span>Tham gia cuộc gọi</span>
                </button>
                {/* 
                <button
                  onClick={handleCancel}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors duration-200"
                >
                  Hủy bỏ
                </button> */}
              </div>

              {/* Status Info */}
              {videoPermission === "granted" &&
                audioPermission === "granted" && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Thiết bị sẵn sàng
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
