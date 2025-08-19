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
  AlertTriangle,
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
  console.log("VideoCallRoom component rendered");
  // States
  const [session, setSession] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callStatus, setCallStatus] = useState("initializing");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("requesting");
  const [retryCount, setRetryCount] = useState(0);
  const [id_connection, setId_connection] = useState(null);
  // Refs
  const userVideoRef = useRef(null);
  const subscribersRef = useRef(null);
  const openViduService = useRef(null);
  if (openViduService.current === null) {
    openViduService.current = new OpenViduService();
  }
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  const { sendMessage } = useWebSocket();

  // Determine if current user is agent or user
  const isAgent = userRole === "AGENT";
  const otherParticipant = isAgent ? callData?.user : callData?.agent;

  useEffect(() => {
    let mounted = true;

    const initializeCall = async () => {
      if (!mounted) return;

      try {
        setCallStatus("initializing");
        setError(null);

        // Kiểm tra kết nối Backend Server trước
        const serverConnected =
          await openViduService.current.checkServerConnection();
        if (!serverConnected) {
          throw new Error(
            "Không thể kết nối tới Backend Server. Vui lòng kiểm tra server đang chạy."
          );
        }

        await initializeSession();
        if (mounted) {
          startCallDuration();
        }
      } catch (error) {
        if (mounted) {
          console.error("Error initializing call:", error);
          setError(error.message);
          setCallStatus("error");
        }
      }
    };

    initializeCall();

    return () => {
      mounted = false;
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
      setPermissionStatus("requesting");

      // Initialize OpenVidu session
      const sessionId = `session-${requestId}`;
      const ovSession = await openViduService.current.initSession(
        sessionId,
        userName,
        null
      );

      setSession(ovSession);

      // Subscribe to OpenVidu events TRƯỚC khi connect
      openViduService.current.subscribeToEvents({
        onStreamCreated: (event, subscriber) => {
          console.log("Stream created:", event);
          setSubscribers((prev) => [...prev, subscriber]);
          setCallStatus("connected");

          // Update participants
          try {
            let connectionData = {};

            // Safer JSON parsing
            if (event.stream.connection.data) {
              try {
                // Try to parse the connection data
                connectionData = JSON.parse(event.stream.connection.data);
                console.log("Connection data:", connectionData);
                if (
                  connectionData.clientData &&
                  typeof connectionData.clientData === "string"
                ) {
                  connectionData = JSON.parse(connectionData.clientData);
                  console.log("Connection data 2:", connectionData);
                }
                // If it's double-encoded JSON string, parse again
                // if (typeof connectionData === "string") {
                //   connectionData = JSON.parse(connectionData);
                //   console.log("Connection data 2:", connectionData);
                // }

                // If it has clientData property, parse that too
                // if (
                //   connectionData.clientData &&
                //   typeof connectionData.clientData === "string"
                // ) {
                //   connectionData = JSON.parse(connectionData.clientData);
                //   console.log("Connection data 3:", connectionData);
                // }
              } catch (innerParseError) {
                console.warn(
                  "Could not parse connection data:",
                  event.stream.connection.data
                );
                connectionData = {
                  userName: "Unknown User",
                  role: isAgent ? "USER" : "AGENT",
                };
              }
            }

            setParticipants((prev) => [
              ...prev,
              {
                id_connection: event.stream.connection.connectionId,
                id: connectionData.userId,
                name: connectionData.userName || "Other participant",
                role: connectionData.role || (isAgent ? "USER" : "AGENT"),
                streamManager: subscriber,
                videoEnabled: event.stream.streamManager.stream.videoActive,
                audioEnabled: event.stream.streamManager.stream.audioActive,
              },
            ]);

            // Attach subscriber to video element với improved approach
            const attachVideo = async () => {
              // Wait for component to be ready
              await new Promise((resolve) => setTimeout(resolve, 100));

              if (subscribersRef.current) {
                try {
                  console.log("Attaching subscriber to video element");

                  // Create video element manually to avoid timing issues
                  const videoElement = document.createElement("video");
                  videoElement.autoplay = true;
                  videoElement.playsInline = true;
                  videoElement.muted = false;
                  videoElement.style.width = "100%";
                  videoElement.style.height = "100%";
                  videoElement.style.objectFit = "cover";

                  // Clear and add video element
                  subscribersRef.current.innerHTML = "";
                  subscribersRef.current.appendChild(videoElement);

                  // Now attach subscriber
                  subscriber.addVideoElement(videoElement);
                } catch (error) {
                  console.error("Error attaching subscriber video:", error);
                }
              }
            };

            attachVideo();
          } catch (parseError) {
            console.error("Error processing connection data:", parseError);

            // Fallback participant data
            setParticipants((prev) => [
              ...prev,
              {
                id: event.stream.connection.connectionId,
                name: "Unknown participant",
                role: isAgent ? "USER" : "AGENT",
                streamManager: subscriber,
                videoEnabled: event.stream.streamManager.stream.videoActive,
                audioEnabled: event.stream.streamManager.stream.audioActive,
              },
            ]);
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
          if (event.reason !== "disconnect") {
            setCallStatus("ended");
          }
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

          // Ignore non-critical exceptions
          if (exception.name === "NO_STREAM_PLAYING_EVENT") {
            console.warn("Stream playing timeout - continuing normally");
            return;
          }

          // Only set error for critical exceptions
          setError(exception.message);
          setCallStatus("error");
        },

        onSignal: (event) => {
          console.log("Signal received:", event);
          handleSignalReceived(event);
        },
      });

      // Connect to session với retry mechanism
      let connected = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!connected && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Connection attempt ${attempts}/${maxAttempts}`);

          await openViduService.current.connectToSession({
            role: userRole,
            userId: userId,
            userName: userName,
          });

          connected = true;
          console.log("Successfully connected to OpenVidu session");
        } catch (connectError) {
          console.error(`Connection attempt ${attempts} failed:`, connectError);

          if (attempts === maxAttempts) {
            throw new Error(
              `Không thể kết nối sau ${maxAttempts} lần thử: ${connectError.message}`
            );
          }

          // Đợi một chút trước khi thử lại
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Publish own stream với permission handling
      try {
        setPermissionStatus("granted");

        const ovPublisher = await openViduService.current.publishStream(
          isVideoEnabled,
          isAudioEnabled
        );

        setPublisher(ovPublisher);

        // Attach publisher to video element với improved approach
        const attachPublisher = async () => {
          // Wait for component to be ready
          await new Promise((resolve) => setTimeout(resolve, 100));

          if (userVideoRef.current) {
            try {
              console.log("Attaching publisher to video element");

              // Create video element manually
              const videoElement = document.createElement("video");
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              videoElement.muted = true; // Publisher is muted to avoid feedback
              videoElement.style.width = "100%";
              videoElement.style.height = "100%";
              videoElement.style.objectFit = "cover";

              // Clear and add video element
              userVideoRef.current.innerHTML = "";
              userVideoRef.current.appendChild(videoElement);

              // Now attach publisher
              ovPublisher.addVideoElement(videoElement);
            } catch (error) {
              console.error("Error attaching publisher video:", error);
            }
          }
        };

        attachPublisher();

        // Add self to participants
        setParticipants((prev) => [
          ...prev,
          {
            id: userId,
            name: userName,
            role: userRole,
            streamManager: ovPublisher,
            videoEnabled: isVideoEnabled,
            audioEnabled: isAudioEnabled,
          },
        ]);

        setCallStatus("connected");
      } catch (publishError) {
        console.error("Error publishing stream:", publishError);

        if (
          publishError.message.includes("Permission") ||
          publishError.message.includes("truy cập")
        ) {
          setPermissionStatus("denied");
          setError(
            "Vui lòng cấp quyền truy cập camera và microphone để tham gia cuộc gọi."
          );
        } else {
          setError(publishError.message);
        }

        setCallStatus("error");
        return;
      }

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
        case "signal:video-toggle":
          console.log(
            `User ${data.userId} toggled video: ${data.videoEnabled}`
          );
          console.log('Current participants before signal update:', participants);
          setParticipants((prev) => {
            const updated = prev.map((p) =>
              p.id === data.userId
                ? { ...p, videoEnabled: data.videoEnabled }
                : p
            );
            console.log('Updated participants after signal:', updated);
            return updated;
          });
          break;
        case "signal:audio-toggle":
          console.log(
            `User ${data.userId} toggled audio: ${data.audioEnabled}`
          );
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === data.userId
                ? { ...p, audioEnabled: data.audioEnabled }
                : p
            )
          );
          break;
        case "signal:screen-share":
          console.log(
            `User ${data.userId} toggled screen share: ${data.screenSharing}`
          );
          break;
        case "signal:recording":
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
    try {
      const newVideoState = openViduService.current.toggleVideo();
      setIsVideoEnabled(newVideoState);

      console.log(`Video toggled: ${newVideoState ? 'enabled' : 'disabled'} for user ${userId}`);
      console.log('Current participants before update:', participants);

      // Update own participant state
      setParticipants((prev) => {
        const updated = prev.map((p) =>
          p.id === userId ? { ...p, videoEnabled: newVideoState } : p
        );
        console.log('Updated participants:', updated);
        return updated;
      });

      // Send signal to other participants
      openViduService.current.sendSignal("video-toggle", {
        userId,
        videoEnabled: newVideoState,
      });

      console.log(`Sent signal: video-toggle for userId ${userId}, enabled: ${newVideoState}`);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  };

  const toggleAudio = () => {
    try {
      const newAudioState = openViduService.current.toggleAudio();
      setIsAudioEnabled(newAudioState);

      // Update own participant state
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === userId ? { ...p, audioEnabled: newAudioState } : p
        )
      );

      // Send signal to other participants
      openViduService.current.sendSignal("audio-toggle", {
        userId,
        audioEnabled: newAudioState,
      });

      // Notify via WebSocket
      // if (isWebSocketConnected) {
      //   sendMessage(`/app/call/${requestId}/audio-toggle`, {
      //     userId,
      //     audioEnabled: newAudioState,
      //   });
      // }
    } catch (error) {
      console.error("Error toggling audio:", error);
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
    try {
      // Leave OpenVidu session
      openViduService.current.leaveSession();

      // Cleanup states
      setSession(null);
      setPublisher(null);
      setSubscribers([]);
      setParticipants([]);
      setCallStatus("ended");
      stopCallDuration();
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  };

  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setCallStatus("initializing");

    // Cleanup trước khi retry
    leaveSession();

    // Đợi một chút trước khi retry
    setTimeout(() => {
      initializeSession();
    }, 1000);
  };

  const requestPermissions = async () => {
    try {
      setPermissionStatus("requesting");

      // Request permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop tracks immediately after getting permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionStatus("granted");

      // Retry initialization
      setTimeout(() => {
        initializeSession();
      }, 500);
    } catch (error) {
      console.error("Permission request failed:", error);
      setPermissionStatus("denied");
      setError(
        "Vui lòng cấp quyền truy cập camera và microphone trong cài đặt trình duyệt."
      );
    }
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
      case "initializing":
        return "bg-blue-500";
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
      case "initializing":
        return "Đang khởi tạo...";
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

  // Permission denied UI
  if (permissionStatus === "denied") {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-4">
          <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Cần quyền truy cập</h2>
          <p className="text-gray-300 mb-6">
            Để tham gia cuộc gọi video, vui lòng cấp quyền truy cập camera và
            microphone.
          </p>
          <div className="space-y-3">
            <button
              onClick={requestPermissions}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg w-full"
            >
              Cấp quyền truy cập
            </button>
            <button
              onClick={onCallEnd}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg w-full"
            >
              Quay lại
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-500">
            <p>Hướng dẫn:</p>
            <p>1. Nhấp vào biểu tượng khóa/camera ở thanh địa chỉ</p>
            <p>2. Chọn "Cho phép" cho Camera và Microphone</p>
            <p>3. Tải lại trang</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
              {/* Video container */}
              <div
                ref={userVideoRef}
                className="w-full h-full absolute inset-0"
              ></div>

              {/* Video placeholder when video is disabled or loading */}
              {(() => {
                const shouldShowPlaceholder = !isVideoEnabled || callStatus !== "connected";

                
                return shouldShowPlaceholder && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
                    <div className="text-gray-400 text-center">
                      {callStatus === "connecting" ||
                      callStatus === "initializing" ? (
                        <>
                          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                          <p>Đang kết nối...</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-2xl text-white font-semibold">
                              {getUserInitials(userName)} 
                            </span>
                          </div>
                          <p>Bạn đang tắt camera</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
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
            <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
              {/* Video container */}
              <div
                ref={subscribersRef}
                className="w-full h-full absolute inset-0"
              ></div>

              {/* Hiển thị avatar khi participant tắt video */}
              {(() => {
                const otherParticipantData = participants.find(
                  (p) => p.id !== userId
                );
                const hasOtherParticipant = subscribers.length > 0;
                const isOtherVideoDisabled =
                  otherParticipantData && !otherParticipantData.videoEnabled;


                // Hiển thị avatar nếu có participant khác và họ tắt video
                return (
                  otherParticipantData &&
                  !otherParticipantData.videoEnabled && (
                    <div className="absolute inset-0 bg-gray-700 flex items-center justify-center z-10">
                      <div className="text-gray-400 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl text-white font-semibold">
                            {getUserInitials(
                              otherParticipantData?.name ||
                                otherParticipant?.fullName ||
                                otherParticipant?.email ||
                                "Unknown"
                            )}
                          </span>
                        </div>
                        <p>Camera tắt</p>
                      </div>
                    </div>
                  )
                );
              })()}

              {/* Trường hợp chưa có ai join */}
              {subscribers.length === 0 && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center z-10">
                  <div className="text-gray-400 text-center">
                    <div className="animate-pulse w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <p>Đang chờ người khác tham gia...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">
                {participants.find((p) => p.id !== userId)?.name ||
                  (isAgent ? "User" : "Agent")}
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
            disabled={callStatus !== "connected"}
            className={`p-4 rounded-full transition-all duration-200 ${
              isVideoEnabled
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-red-600 text-white hover:bg-red-700"
            } ${
              callStatus !== "connected" ? "opacity-50 cursor-not-allowed" : ""
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
            disabled={callStatus !== "connected"}
            className={`p-4 rounded-full transition-all duration-200 ${
              isAudioEnabled
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-red-600 text-white hover:bg-red-700"
            } ${
              callStatus !== "connected" ? "opacity-50 cursor-not-allowed" : ""
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
            disabled={callStatus !== "connected"}
            className={`p-4 rounded-full transition-all duration-200 ${
              isScreenSharing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } ${
              callStatus !== "connected" ? "opacity-50 cursor-not-allowed" : ""
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
              disabled={callStatus !== "connected"}
              className={`p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200 ${
                callStatus !== "connected"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Chụp ảnh màn hình"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}

          {/* Recording */}
          <button
            onClick={toggleRecording}
            disabled={callStatus !== "connected"}
            className={`p-4 rounded-full transition-all duration-200 ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } ${
              callStatus !== "connected" ? "opacity-50 cursor-not-allowed" : ""
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
            onClick={() => {
              leaveSession();
              setTimeout(onCallEnd, 1000);
            }}
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
                  <p>Lần thử: {retryCount > 0 ? retryCount : "Lần đầu"}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Chất lượng video
                </label>
                <select className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg">
                  <option value="480p">SD (480p) - Tiết kiệm băng thông</option>
                  <option value="720p" selected>
                    HD (720p) - Khuyến nghị
                  </option>
                  <option value="1080p">
                    Full HD (1080p) - Chất lượng cao
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Người tham gia ({participants.length})
                </label>
                <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {participants.length > 0 ? (
                    participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between text-sm text-white mb-1"
                      >
                        <span>{participant.name}</span>
                        <span className="text-gray-400 text-xs">
                          {participant.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Chưa có người tham gia
                    </p>
                  )}
                </div>
              </div>

              {/* Debug info */}
              {callStatus === "error" && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Thông tin lỗi
                  </label>
                  <div className="bg-red-900 text-red-200 px-3 py-2 rounded-lg text-xs">
                    <p>Lỗi: {error}</p>
                    <p>Status: {callStatus}</p>
                    <p>Permission: {permissionStatus}</p>
                  </div>
                </div>
              )}
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
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Lỗi kết nối</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                disabled={retryCount >= 3}
                className={`px-6 py-2 rounded-lg mr-3 ${
                  retryCount >= 3
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {retryCount >= 3
                  ? "Đã thử tối đa"
                  : `Thử lại (${3 - retryCount})`}
              </button>
              <button
                onClick={onCallEnd}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
              >
                Quay lại
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-4">
              <p>Kiểm tra:</p>
              <p>• OpenVidu Server đang chạy tại localhost:4443</p>
              <p>• Quyền truy cập camera/microphone đã được cấp</p>
              <p>• Kết nối Internet ổn định</p>
            </div>
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
            <button
              onClick={onCallEnd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Quay lại Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
