import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Camera,
  Square,
  Circle,
  PhoneOff,
  Settings,
  Maximize,
  Minimize,
  Users,
  MessageSquare,
} from "lucide-react";
import { useWebSocket } from "../../context/WebSocketContext";
import OpenViduService from "../../services/OpenViduService";

export const VideoCallRoom = ({
  requestId,
  callData,
  userRole,
  userId,
  userName,
  onCallEnd,
  isWebSocketConnected,
}) => {
  // States
  const [session, setSession] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callStatus, setCallStatus] = useState("connecting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);

  // Refs
  const userVideoRef = useRef(null);
  const subscribersRef = useRef(null);
  const openViduService = useRef(new OpenViduService());
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  const { sendMessage } = useWebSocket();

  // Determine if current user is agent or user
  const isAgent = userRole === "AGENT";
  const otherParticipant = isAgent ? callData.user : callData.agent;

  useEffect(() => {
    initializeSession();
    startCallDuration();

    return () => {
      leaveSession();
      stopCallDuration();
    };
  }, []);

  const startCallDuration = () => {
    callStartTime.current = Date.now();
    durationInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  };

  const stopCallDuration = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const initializeSession = async () => {
    try {
      setCallStatus("connecting");

      // Initialize OpenVidu session
      const sessionId = `session-${requestId}`;
      const ovSession = await openViduService.current.initSession(
        sessionId,
        userName,
        null
      );

      setSession(ovSession);
      
      // Connect to session
      await openViduService.current.connectToSession({
        role: userRole,
        userId: userId,
        userName: userName,
      });
      // Subscribe to OpenVidu events
      openViduService.current.subscribeToEvents({
        onStreamCreated: (event, subscriber) => {
          console.log("Stream created:", event);
          setSubscribers((prev) => [...prev, subscriber]);
          setCallStatus("connected");

          // Update participants
          const connectionData = JSON.parse(event.stream.connection.data);
          setParticipants((prev) => [
            ...prev,
            {
              id: event.stream.connection.connectionId,
              name: connectionData.userName || "Other participant",
              role: isAgent ? "USER" : "AGENT",
              streamManager: subscriber,
            },
          ]);

          // Attach subscriber to video element
          if (subscribersRef.current) {
            subscriber.addVideoElement(subscribersRef.current);
          }
        },

        onStreamDestroyed: (event) => {
          console.log("Stream destroyed:", event);
          setSubscribers((prev) =>
            prev.filter((sub) => sub !== event.stream.streamManager)
          );

          // Remove participant
          setParticipants((prev) =>
            prev.filter((p) => p.id !== event.stream.connection.connectionId)
          );
        },

        onSessionDisconnected: (event) => {
          console.log("Session disconnected:", event);
          setCallStatus("ended");
          setParticipants([]);
          setSubscribers([]);
        },

        onConnectionCreated: (event) => {
          console.log("New participant joined:", event.connection);
        },

        onConnectionDestroyed: (event) => {
          console.log("Participant left:", event.connection);
        },

        onException: (exception) => {
          console.error("OpenVidu exception:", exception);
          setError(exception.message);
          setCallStatus("error");
        },

        onSignal: (event) => {
          console.log("Signal received:", event);
          // Handle custom signals (video toggle, audio toggle, etc.)
          handleSignalReceived(event);
        },
      });



      // Publish own stream
      const ovPublisher = await openViduService.current.publishStream(
        isVideoEnabled,
        isAudioEnabled
      );
      setPublisher(ovPublisher);

      // Attach publisher to video element
      if (userVideoRef.current) {
        ovPublisher.addVideoElement(userVideoRef.current);
      }

      // Add self to participants
      setParticipants((prev) => [
        ...prev,
        {
          id: userId,
          name: userName,
          role: userRole,
          streamManager: ovPublisher,
        },
      ]);

      // Notify via WebSocket that call started
      // if (isWebSocketConnected) {
      //   sendMessage(`/app/call/${requestId}/join`, {
      //     userId,
      //     userName,
      //     userRole,
      //     action: "joined"
      //   });
      // }

      console.log("OpenVidu session initialized successfully");
    } catch (error) {
      console.error("Error initializing OpenVidu session:", error);
      setError(error.message);
      setCallStatus("error");
    }
  };

  const handleSignalReceived = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (event.type) {
        case "video-toggle":
          console.log(
            `User ${data.userId} toggled video: ${data.videoEnabled}`
          );
          break;
        case "audio-toggle":
          console.log(
            `User ${data.userId} toggled audio: ${data.audioEnabled}`
          );
          break;
        case "screen-share":
          console.log(
            `User ${data.userId} toggled screen share: ${data.screenSharing}`
          );
          break;
        case "recording":
          console.log(
            `User ${data.userId} toggled recording: ${data.recording}`
          );
          break;
        default:
          console.log("Unknown signal type:", event.type);
      }
    } catch (error) {
      console.error("Error handling signal:", error);
    }
  };

  const toggleVideo = () => {
    const newVideoState = openViduService.current.toggleVideo();
    setIsVideoEnabled(newVideoState);

    // Send signal to other participants
    openViduService.current.sendSignal("video-toggle", {
      userId,
      videoEnabled: newVideoState,
    });

    // Notify via WebSocket
    if (isWebSocketConnected) {
      sendMessage(`/app/call/${requestId}/video-toggle`, {
        userId,
        videoEnabled: newVideoState,
      });
    }
  };

  const toggleAudio = () => {
    const newAudioState = openViduService.current.toggleAudio();
    setIsAudioEnabled(newAudioState);

    // Send signal to other participants
    openViduService.current.sendSignal("audio-toggle", {
      userId,
      audioEnabled: newAudioState,
    });

    // Notify via WebSocket
    if (isWebSocketConnected) {
      sendMessage(`/app/call/${requestId}/audio-toggle`, {
        userId,
        audioEnabled: newAudioState,
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await openViduService.current.startScreenShare();
      } else {
        await openViduService.current.stopScreenShare();
      }

      setIsScreenSharing(!isScreenSharing);

      // Send signal to other participants
      openViduService.current.sendSignal("screen-share", {
        userId,
        screenSharing: !isScreenSharing,
      });

      // Notify via WebSocket
      if (isWebSocketConnected) {
        sendMessage(`/app/call/${requestId}/screen-share`, {
          userId,
          screenSharing: !isScreenSharing,
        });
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      alert("Không thể chia sẻ màn hình. Vui lòng thử lại.");
    }
  };

  const takeScreenshot = () => {
    if (isAgent) {
      console.log("Taking screenshot...");
      // Implement screenshot logic for agents

      if (isWebSocketConnected) {
        sendMessage(`/app/call/${requestId}/screenshot`, {
          userId,
          timestamp: Date.now(),
        });
      }
    }
  };

  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    setCallStatus(newRecordingState ? "recording" : "connected");

    // Send signal to other participants
    openViduService.current.sendSignal("recording", {
      userId,
      recording: newRecordingState,
      timestamp: Date.now(),
    });

    // Notify via WebSocket
    if (isWebSocketConnected) {
      sendMessage(`/app/call/${requestId}/recording`, {
        userId,
        recording: newRecordingState,
        timestamp: Date.now(),
      });
    }
  };

  const leaveSession = () => {
    // Notify other participants before leaving
    // if (isWebSocketConnected) {
    //   sendMessage(`/app/call/${requestId}/leave`, {
    //     userId,
    //     userName,
    //     timestamp: Date.now(),
    //   });
    // }

    // Leave OpenVidu session
    openViduService.current.leaveSession();

    // Cleanup states
    setSession(null);
    setPublisher(null);
    setSubscribers([]);
    setParticipants([]);
    setCallStatus("ended");
    stopCallDuration();

    // Redirect after a short delay
    setTimeout(() => {
      onCallEnd();
    }, 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case "connecting":
        return "bg-yellow-500";
      case "connected":
        return "bg-green-500";
      case "recording":
        return "bg-red-500";
      case "ended":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return "Đang kết nối...";
      case "connected":
        return "Đã kết nối";
      case "recording":
        return "Đang ghi hình";
      case "ended":
        return "Cuộc gọi đã kết thúc";
      case "error":
        return "Lỗi kết nối";
      default:
        return "Không xác định";
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
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header với thông tin cuộc gọi */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}
          ></div>
          <span className="text-white font-medium">{getStatusText()}</span>

          <div className="flex items-center space-x-2 text-gray-300">
            <span>•</span>
            <span>{formatDuration(callDuration)}</span>
          </div>

          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
              <Circle className="w-3 h-3 text-white fill-current animate-pulse" />
              <span className="text-white text-sm font-medium">REC</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-gray-300 text-sm">
            <span className="font-medium">Request #{requestId}</span>
            <span className="mx-2">•</span>
            <span>{isAgent ? "Agent" : "User"} View</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-1 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">{participants.length}</span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Cài đặt"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative p-4 bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Own Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
            <div
              ref={userVideoRef}
              className="w-full h-full bg-gray-700 flex items-center justify-center"
            >
              {/* Real OpenVidu video will be attached here */}
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
                  <div className="text-gray-400 text-center">
                    <VideoOff className="w-16 h-16 mx-auto mb-4" />
                    <p>Camera tắt</p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">
                {userName} (Bạn)
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Other Participants Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
            <div
              ref={subscribersRef}
              className="w-full h-full bg-gray-700 flex items-center justify-center"
            >
              {subscribers.length > 0 ? (
                // Real OpenVidu video will be attached here
                <div className="w-full h-full"></div>
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl">
                      {getUserInitials(
                        otherParticipant?.fullName || otherParticipant?.email
                      )}
                    </span>
                  </div>
                  <p>Đang chờ {isAgent ? "User" : "Agent"}...</p>
                </div>
              )}
            </div>

            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">
                {participants.length > 1
                  ? participants.find((p) => p.id !== userId)?.name ||
                    (isAgent ? "User" : "Agent")
                  : isAgent
                  ? "User"
                  : "Agent"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex justify-center items-center space-x-4">
          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 ${
              isVideoEnabled
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isVideoEnabled ? "Tắt camera" : "Bật camera"}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all duration-200 ${
              isAudioEnabled
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isAudioEnabled ? "Tắt micro" : "Bật micro"}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all duration-200 ${
              isScreenSharing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={
              isScreenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"
            }
          >
            <Monitor className="w-6 h-6" />
          </button>

          {/* Screenshot (chỉ Agent) */}
          {isAgent && (
            <button
              onClick={takeScreenshot}
              className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
              title="Chụp ảnh màn hình"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}

          {/* Recording */}
          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all duration-200 ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={isRecording ? "Dừng ghi hình" : "Bắt đầu ghi hình"}
          >
            {isRecording ? (
              <Square className="w-6 h-6" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </button>

          {/* Leave Call */}
          <button
            onClick={leaveSession}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 ml-8"
            title="Rời cuộc gọi"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Control Labels */}
        <div className="flex justify-center items-center space-x-4 mt-2">
          <span className="text-xs text-gray-400 w-14 text-center">
            {isVideoEnabled ? "Camera" : "Tắt cam"}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">
            {isAudioEnabled ? "Micro" : "Tắt mic"}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">
            {isScreenSharing ? "Đang chia sẻ" : "Chia sẻ"}
          </span>
          {isAgent && (
            <span className="text-xs text-gray-400 w-14 text-center">
              Chụp ảnh
            </span>
          )}
          <span className="text-xs text-gray-400 w-14 text-center">
            {isRecording ? "Đang ghi" : "Ghi hình"}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center ml-8">
            Rời phòng
          </span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-96 max-w-90vw">
            <h3 className="text-white text-lg font-semibold mb-4">
              Cài đặt cuộc gọi
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Thông tin cuộc gọi
                </label>
                <div className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                  <p>Request ID: {requestId}</p>
                  <p>Vai trò: {isAgent ? "Agent" : "User"}</p>
                  <p>Thời gian: {formatDuration(callDuration)}</p>
                  <p>Trạng thái: {getStatusText()}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Chất lượng video
                </label>
                <select className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg">
                  <option value="720p">HD (720p)</option>
                  <option value="1080p">Full HD (1080p)</option>
                  <option value="480p">SD (480p)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Người tham gia
                </label>
                <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between text-sm text-white mb-1"
                    >
                      <span>{participant.name}</span>
                      <span className="text-gray-400 text-xs">
                        {participant.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && callStatus === "error" && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white max-w-md mx-4">
            <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Lỗi kết nối</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setError(null);
                  setCallStatus("connecting");
                  initializeSession();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-3"
              >
                Thử lại
              </button>
              <button
                onClick={onCallEnd}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
              >
                Quay lại
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Đảm bảo OpenVidu Server đang chạy tại localhost:4443
            </p>
          </div>
        </div>
      )}

      {/* Call Ended Overlay */}
      {callStatus === "ended" && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Cuộc gọi đã kết thúc</h2>
            <p className="text-gray-300 mb-4">
              Thời gian gọi: {formatDuration(callDuration)}
            </p>
            <p className="text-gray-400">Đang chuyển hướng...</p>
          </div>
        </div>
      )}
    </div>
  );
};
