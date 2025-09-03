import React, { useState, useEffect, useRef } from "react";
import ScreenshotPreview from "../Screenshot/ScreenshotPreview";
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
  Phone,
  Star,
  ArrowRight,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { useWebSocket } from "../../context/WebSocketContext";
import OpenViduService from "../../services/OpenViduService";
import { useUser } from "../../context/UserContext";
import ImageEditor from "../Screenshot/ImageEditor";
import { usePermissionUpdates } from "../../hooks/usePermissionUpdates";
import { useCallUpdates } from "../../hooks/useCallUpdates";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { p } from "framer-motion/client";

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

  // Get permission state from previous page
  const getInitialPermissionState = () => {
    try {
      const savedState = sessionStorage.getItem(`permissions_${requestId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Check if permission state is not too old (15 minutes)
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          return {
            video: parsed.videoEnabled,
            audio: parsed.audioEnabled,
          };
        }
      }
    } catch (error) {
      console.warn("Could not parse permission state:", error);
    }
    return { video: true, audio: true }; // Default values
  };
  const [sessionId, setSessionId] = useState(null);
  const initialPermissions = getInitialPermissionState();

  // States
  const [session, setSession] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(
    initialPermissions.video
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    initialPermissions.audio
  );
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

  // Modal confirmation states 
  const [showPermissionCancelledModal, setShowPermissionCancelledModal] = useState(false);
  const [permissionCancelledMessage, setPermissionCancelledMessage] = useState("");
  const [showCallEndedModal, setShowCallEndedModal] = useState(false);
  const [callEndedMessage, setCallEndedMessage] = useState("");
  const { permissionNotifications, clearPermissionNotifications } =
    usePermissionUpdates();
  const { callNotifications, clearCallNotifications } = useCallUpdates();
  const { user, token } = useUser();

  const [selectedRating, setSelectedRating] = useState(3);
  const [ratingDescription, setRatingDescription] =
    useState("Hỗ trợ bình thường");
  const [feedbackText, setFeedbackText] = useState("");

  // State cho ảnh
  const [screenshotData, setScreenshotData] = useState(null);
  const [showScreenshotPreview, setShowScreenshotPreview] = useState(false);
  const [agentImageData, setAgentImageData] = useState(null);
  const [showAgentImagePreview, setShowAgentImagePreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageData, setEditingImageData] = useState(null);
  const [showSendSuccessPopup, setShowSendSuccessPopup] = useState(false); // Popup gửi thành công
  const [showReceivedImagePopup, setShowReceivedImagePopup] = useState(false); // Popup nhận ảnh
  const [receivedImageData, setReceivedImageData] = useState(null);
  const [sentImages, setSentImages] = useState([]); // Danh sách ảnh đã gửi (agent)
  const [receivedImages, setReceivedImages] = useState([]); // Danh sách ảnh đã nhận (user)
  const [showImagesPanel, setShowImagesPanel] = useState(false); // Panel danh sách ảnh

  //State cho segment
  const [autoRecordingData, setAutoRecordingData] = useState(null);
  const [agentRecordingActive, setAgentRecordingActive] = useState(false);
  const [recordingSegment, setRecordingSegment] = useState(null);

  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");

  // Refs
  const userVideoRef = useRef(null);
  const subscribersRef = useRef(null);
  const openViduService = useRef(null);
  if (openViduService.current === null) {
    openViduService.current = new OpenViduService();
  }
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);
  const screenShareTrackRef = useRef(null);

  // Handle permission cancelled notifications
  useEffect(() => {
    if (permissionNotifications.length > 0) {
      const notification = permissionNotifications[0];

              if (notification?.type === "permission_cancelled") {
          const isUserCancelled = notification?.isUserCancelled;
          const message = isUserCancelled
            ? "User đã hủy bỏ cuộc gọi từ trang chuẩn bị. Cuộc gọi sẽ kết thúc."
            : "Agent đã hủy bỏ cuộc gọi từ trang chuẩn bị. Cuộc gọi sẽ kết thúc.";

          setPermissionCancelledMessage(message);
          setShowPermissionCancelledModal(true);

          // Clear notifications
          clearPermissionNotifications();
        }
    }
  }, [permissionNotifications, clearPermissionNotifications]);

  // Handle call ended notifications
  useEffect(() => {
    if (callNotifications.length > 0) {
      const notification = callNotifications[0];

              if (notification?.type === "call_ended") {
          const isUserEnded = notification?.isUserEnded;
          const message = isUserEnded
            ? "User đã rời khỏi cuộc gọi. Cuộc gọi sẽ kết thúc."
            : "Agent đã rời khỏi cuộc gọi. Cuộc gọi sẽ kết thúc.";

          setCallEndedMessage(message);
          setShowCallEndedModal(true);

          // Clear notifications
          clearCallNotifications();
        }
    }
  }, [callNotifications, clearCallNotifications]);

  const { sendMessage } = useWebSocket();

  // Determine if current user is agent or user
  const isAgent = userRole === "AGENT";
  const otherParticipant = isAgent ? callData?.user : callData?.agent;
  const [isParticipantInRoom, setIsParticipantInRoom] = useState(false);

  const compressImage = (imageData, maxWidth = 800, maxHeight = 600) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // Giảm chất lượng
      };
      img.src = imageData;
    });
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const initializeCall = async () => {
      if (!mounted) return;

      try {
        setCallStatus("initializing");
        setError(null);

        // Kiểm tra kết nối Backend Server trước
        const serverConnected = await openViduService.current.checkServerConnection();
        if (!serverConnected) {
          throw new Error(
            "Không thể kết nối tới Backend Server. Vui lòng kiểm tra server đang chạy."
          );
        }

        await initializeSession();
        if (mounted) {
        }
      } catch (error) {
        if (mounted) {
          console.error("Error initializing call:", error);
          setError(error.message);
          setCallStatus("error");
        }
      }
    };

    // // Handle beforeunload để gửi notification khi đóng tab
    // const handleBeforeUnload = async (event) => {
    //   try {
    //     // Sử dụng sendBeacon để đảm bảo request được gửi ngay cả khi thoát tab
    //     const data = JSON.stringify({});
    //     navigator.sendBeacon(
    //       `http://localhost:8081/api/support/requests/${requestId}/end-call`,
    //       data
    //     );
    //   } catch (error) {
    //     console.error("Error sending end call beacon:", error);
    //   }
    // };

    initializeCall();

    // // Thêm event listener cho beforeunload
    // window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      mounted = false;

      // // Remove event listener
      // window.removeEventListener("beforeunload", handleBeforeUnload);

      // Xóa timeout khi component unmount
      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log("Timeout cleared during cleanup");
      }
      console.log("VideoCallRoom component unmounting, performing cleanup...");

      try {
        leaveSession();
        stopCallDuration();

        // Cleanup permission state
        sessionStorage.removeItem(`permissions_${requestId}`);

        // Force cleanup if normal cleanup fails
        if (openViduService.current) {
          openViduService.current.forceCleanup();
        }

        console.log("VideoCallRoom cleanup completed");
      } catch (error) {
        console.error("Error during component cleanup:", error);

        // Ensure force cleanup runs even if normal cleanup fails
        if (openViduService.current) {
          openViduService.current.forceCleanup();
        }
      }
    };
  }, []);

  useEffect(() => {
    let timeoutId = null;

    if (participants.length >= 2) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log("Timeout cleared: Enough participants joined");
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log("Timeout cleared during participants change cleanup");
      }
    };
  }, [participants]);

  useEffect(() => {
    // Chỉ gọi startAutoRecording khi có đủ 2 người tham gia
    if (isAgent && participants.length === 2 && !autoRecordingData) {
      const initiateRecording = async () => {
        try {
          console.log("Starting auto recording for all calls");
          const user = participants.find((p) => p.role === "USER");
          const autoRecordingResult = await openViduService.current.startAutoRecording(
            userId, // agentId
            user.id, // userId
            requestId
          );
          setAutoRecordingData(autoRecordingResult);
          console.log("Auto recording started:", autoRecordingResult);
        } catch (error) {
          console.error("Error starting auto recording:", error);
        }
      };
      initiateRecording();
    }
  }, [participants, isAgent, autoRecordingData, userId, requestId]);

  const startAutoRecording = async () => {
        try {
          console.log("Starting auto recording for all calls");
          const autoRecordingResult = await openViduService.current.startAutoRecording(
            participants[0]?.id || userId, // agentId
            participants[1]?.id || (isAgent ? userId : null), // userId  
            requestId
          );
          
          setAutoRecordingData(autoRecordingResult);
          console.log("Auto recording started:", autoRecordingResult);
        } catch (error) {
          console.error("Error starting auto recording:", error);
          
        }
  };
  const stopAutoRecording = async () => {
    try {
      if (autoRecordingData) {
        console.log("Stopping auto recording");
        const result = await openViduService.current.stopAutoRecording();
        console.log("Auto recording stopped:", result);
      }
    } catch (error) {
      console.error("Error stopping auto recording:", error);
    }
  };

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
      setSessionId(sessionId);
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
          
          // Set participant in room khi có người khác tham gia
          setIsParticipantInRoom(true);

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
          // setIsParticipantInRoom(false);
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
          console.log(
            "Current participants before signal update:",
            participants
          );
          setParticipants((prev) => {
            const updated = prev.map((p) =>
              p.id === data.userId
                ? { ...p, videoEnabled: data.videoEnabled }
                : p
            );
            console.log("Updated participants after signal:", updated);
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
          setAgentRecordingActive(true);
          setCallStatus("recording");
          break;
        case "signal:recording-stop":
          setAgentRecordingActive(false);
          setCallStatus("connected");
          if (data.recordingData) {
            setRecordingData(data.recordingData);
            setShowRecordingResult(true);
          }
          break;
        case "signal:image":
          if (!isAgent) {
            const newImage = {
              id: Date.now(),
              data: data.imageData,
              timestamp: new Date().toLocaleString(),
            };
            setReceivedImages((prev) => [...prev, newImage]);
            setReceivedImageData(data.imageData);
            setShowReceivedImagePopup(true);
          }
          break;
        // case "signal:call-end":
        //   console.log(`User ${data.userId} ended the call`);
        //   leaveSession();
        //   break;
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

      console.log(
        `Video toggled: ${
          newVideoState ? "enabled" : "disabled"
        } for user ${userId}`
      );
      console.log("Current participants before update:", participants);

      // Update own participant state
      setParticipants((prev) => {
        const updated = prev.map((p) =>
          p.id === userId ? { ...p, videoEnabled: newVideoState } : p
        );
        console.log("Updated participants:", updated);
        return updated;
      });

      // Send signal to other participants
      openViduService.current.sendSignal("video-toggle", {
        userId,
        videoEnabled: newVideoState,
      });

      console.log(
        `Sent signal: video-toggle for userId ${userId}, enabled: ${newVideoState}`
      );
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
        // Bắt đầu chia sẻ màn hình
        const screenPublisher = await openViduService.current.startScreenShare(isAudioEnabled);
        setIsScreenSharing(true);

        // Lấy screen track để lắng nghe sự kiện ended
        const stream = screenPublisher.stream.getMediaStream();
        const videoTrack = stream.getVideoTracks()[0];
        screenShareTrackRef.current = videoTrack;

        // Lắng nghe sự kiện ended khi user dừng screen share từ trình duyệt
        videoTrack.addEventListener('ended', async () => {
          console.log('Screen share stopped by browser');
          try {
            // Dừng screen share và quay về camera
            const cameraPublisher = await openViduService.current.stopScreenShare(isAudioEnabled);
            setIsScreenSharing(false);
            screenShareTrackRef.current = null;

            // Gắn luồng camera vào userVideoRef
            if (userVideoRef.current && cameraPublisher) {
              const videoElement = document.createElement("video");
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              videoElement.muted = true;
              videoElement.style.width = "100%";
              videoElement.style.height = "100%";
              videoElement.style.objectFit = "cover";

              userVideoRef.current.innerHTML = "";
              userVideoRef.current.appendChild(videoElement);
              cameraPublisher.addVideoElement(videoElement);
            }

            // Gửi signal để thông báo cho người khác
            openViduService.current.sendSignal("screen-share", {
              userId,
              screenSharing: false,
            });

            if (isWebSocketConnected) {
              sendMessage(`/app/call/${requestId}/screen-share`, {
                userId,
                screenSharing: false,
              });
            }
          } catch (error) {
            console.error("Error handling browser screen share stop:", error);
            setError(`Lỗi khi xử lý dừng chia sẻ màn hình: ${error.message}`);
          }
        });

        // Gắn luồng screen vào userVideoRef
        if (userVideoRef.current && screenPublisher) {
          const videoElement = document.createElement("video");
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true;
          videoElement.style.width = "100%";
          videoElement.style.height = "100%";
          videoElement.style.objectFit = "cover";

          userVideoRef.current.innerHTML = "";
          userVideoRef.current.appendChild(videoElement);
          screenPublisher.addVideoElement(videoElement);
        }

        // Gửi signal
        openViduService.current.sendSignal("screen-share", {
          userId,
          screenSharing: true,
        });

        if (isWebSocketConnected) {
          sendMessage(`/app/call/${requestId}/screen-share`, {
            userId,
            screenSharing: true,
          });
        }
      } else {
        // Dừng chia sẻ màn hình bằng button
        const cameraPublisher = await openViduService.current.stopScreenShare(isAudioEnabled);
        setIsScreenSharing(false);
        
        // Clear screen track reference
        if (screenShareTrackRef.current) {
          screenShareTrackRef.current.removeEventListener('ended', () => {});
          screenShareTrackRef.current = null;
        }

        // Gắn luồng camera vào userVideoRef
        if (userVideoRef.current && cameraPublisher) {
          const videoElement = document.createElement("video");
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true;
          videoElement.style.width = "100%";
          videoElement.style.height = "100%";
          videoElement.style.objectFit = "cover";

          userVideoRef.current.innerHTML = "";
          userVideoRef.current.appendChild(videoElement);
          cameraPublisher.addVideoElement(videoElement);
        }

        // Gửi signal
        openViduService.current.sendSignal("screen-share", {
          userId,
          screenSharing: false,
        });

        if (isWebSocketConnected) {
          sendMessage(`/app/call/${requestId}/screen-share`, {
            userId,
            screenSharing: false,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      setError(`Lỗi khi chuyển đổi chia sẻ màn hình: ${error.message}`);
      setCallStatus("error");
    }
  };

  const takeScreenshot = () => {
    if (isAgent) {
      console.log("Taking screenshot...");
      const videoElement = subscribersRef.current?.querySelector("video");
      if (videoElement) {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const screenshotData = canvas.toDataURL("image/png");
        console.log("Screenshot taken:", screenshotData);
        setScreenshotData(screenshotData);
        setShowScreenshotPreview(true); // Hiển thị modal preview

        if (isWebSocketConnected) {
          sendMessage(`/app/call/${requestId}/screenshot`, {
            userId,
            timestamp: Date.now(),
          });
        }
      } else {
        console.error("No video element found for screenshot");
        alert("Không thể chụp ảnh màn hình. Vui lòng kiểm tra video.");
      }
    }
  };

  const handleSendImage = async (imageData) => {
    if (session) {
      try {
        const compressedImage = await compressImage(imageData);
        openViduService.current.sendSignal("image", {
          userId,
          imageData: compressedImage,
        });
        console.log("Image sent:", compressedImage);
        if (isAgent) {
          setSentImages((prev) => [
            ...prev,
            {
              id: Date.now(),
              data: compressedImage,
              timestamp: new Date().toLocaleString(),
            },
          ]);
        }
        setShowAgentImagePreview(false);
        setShowImageEditor(false);
        setEditingImageData(null);
        setShowSendSuccessPopup(true); // Hiển thị popup gửi thành công
        setTimeout(() => setShowSendSuccessPopup(false), 3000); // Tự động đóng sau 3 giây
      } catch (error) {
        console.error("Error sending image:", error);
        alert("Không thể gửi ảnh. Vui lòng thử lại.");
      }
    } else {
      console.error("No session available to send image");
      alert("Không có phiên hoạt động để gửi ảnh.");
    }
  };

  const handleEditImage = (imageData) => {
    setEditingImageData(imageData);
    setShowImageEditor(true);
    setShowScreenshotPreview(false);
    setShowAgentImagePreview(false);
  };

  const toggleRecording = async () => {
    if (agentRecordingActive) {
      try {
        // Dừng agent recording segment
        console.log("Stopping agent recording segment...", recordingSegment);
        await openViduService.current.stopAgentRecording(recordingSegment.segmentId);
        setAgentRecordingActive(false);
        showPopupMessage("Record đã được lưu lại");
        // Gửi signal để thông báo dừng recording segment
        openViduService.current.sendSignal("recording-stop", {
          userId,
          recording: false,
          timestamp: Date.now(),
        });
        
        console.log("Agent recording segment stopped");
      } catch (error) {
        console.error("Error stopping agent recording segment:", error);
        alert("Không thể dừng ghi hình. Vui lòng thử lại.");
      }
    } else {
      try {
        // Bắt đầu agent recording segment
        const segment = await openViduService.current.startAgentRecording();
        setAgentRecordingActive(true);
        setRecordingSegment(segment);
        console.log("Starting agent recording segment...", segment);
        // Gửi signal để thông báo bắt đầu recording segment
        openViduService.current.sendSignal("recording", {
          userId,
          recording: true,
          timestamp: Date.now(),
        });
        
        console.log("Agent recording segment started");
        
      } catch (error) {
        console.error("Error starting agent recording segment:", error);
        alert("Không thể bắt đầu ghi hình. Vui lòng thử lại.");
      }
    }
  };
  



  const leaveSession = async () => {
    try {
      if(agentRecordingActive && isAgent) {
        await openViduService.current.stopAgentRecording(recordingSegment.segmentId);
      }
      if (isAgent){
        stopAutoRecording();
      }
              console.log("Leaving OpenVidu session and updating user status...");
        
        // Gửi OpenVidu signal để notify thông qua OpenVidu (fallback)
        openViduService.current.sendSignal("call-end", {
          userId,
          timestamp: Date.now(),
        });

      // Leave OpenVidu session
      openViduService.current.leaveSession();

      // Cleanup states
      setSession(null);
      setPublisher(null);
      setSubscribers([]);
      setParticipants([]);
      setCallStatus("ended");
      stopCallDuration();

      // Cleanup permission state to prevent re-use
      sessionStorage.removeItem(`permissions_${requestId}`);

      console.log("Successfully left session and cleaned up states");
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  };

  const showPopupMessage = (msg) => {
    setMessage(msg);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
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
  const getRatingDescription = (rating) => {
    switch (rating) {
      case 1:
        return "Rất tệ"
      case 2:
        return "Tệ"
      case 3:
        return "Hỗ trợ bình thường"
      case 4:
        return "Tốt"
      case 5:
        return "Rất tốt"
      default:
        return "Hỗ trợ bình thường"
    }
  }
  const handleStarClick = (rating) => {
    setSelectedRating(rating)
    setRatingDescription(getRatingDescription(rating))
  }

  // Handle confirmation when other participant cancelled from permission page
  const handlePermissionCancelledConfirmation = () => {
    setShowPermissionCancelledModal(false);
    onCallEnd(); // End the call and navigate back
  };

  // Handle confirmation when other participant ended the call
  const handleCallEndedConfirmation = () => {
    setShowCallEndedModal(false);
    handleLeaveCall(true); // Just navigate back without additional cleanup
  };
  const handleLeaveCall = async (isReceiver = false) => {
    console.log("Leave call button clicked");
    try {
      // Gửi notification tới server TRƯỚC khi leave session
      if(isReceiver === false) {
        await axios.post(
          `http://localhost:8081/api/support/requests/${requestId}/end-call`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }

      // Then leave the session and cleanup
      await leaveSession();
      

      // Small delay to ensure cleanup completes
      // setTimeout(() => {
      //   console.log("Calling onCallEnd after leaving session");
      //   onCallEnd();
      // }, 500);
    } catch (error) {
      console.error("Error during leave call process:", error);
      // Still call onCallEnd even if there's an error
      onCallEnd();
    }
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
            <div className="flex items-center space-x-1 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">{subscribers.length+1}</span>
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
      {/* Main Content */}
      <div className="flex-1 relative p-4 bg-gray-900 flex gap-4">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Own Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
            <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
              <div
                ref={userVideoRef}
                className="w-full h-full absolute inset-0"
              ></div>
              {(!isVideoEnabled ||
                callStatus === "connecting" ||
                callStatus === "initializing") && (
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
            <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
              <div
                ref={subscribersRef}
                className="w-full h-full absolute inset-0"
              ></div>
              {(() => {
                const otherParticipantData = participants.find(
                  (p) => p.id !== userId
                );
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

        {/* Images Panel */}
        {showImagesPanel && (
          <div
            className={`w-full sm:w-1/3 lg:w-1/4 max-w-sm min-w-[200px] bg-gray-100 p-4 flex flex-col z-50 transition-transform duration-300 transform sm:transform-none rounded-xl shadow-lg ${
              showImagesPanel ? "translate-x-0" : "translate-x-full"
            } sm:translate-x-0 fixed sm:static right-0 top-0 h-full`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-800 text-lg font-semibold">
                {isAgent ? "Ảnh đã gửi" : "Ảnh đã nhận"} (
                {(isAgent ? sentImages : receivedImages).length})
              </h3>
              <button
                onClick={() => setShowImagesPanel(false)}
                className="text-gray-500 hover:text-gray-800 transition-colors"
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
            <div className="flex-1 overflow-y-auto">
              {(isAgent ? sentImages : receivedImages).length > 0 ? (
                (isAgent ? sentImages : receivedImages).map((image) => (
                  <div
                    key={image.id}
                    className="flex items-center justify-between text-sm text-gray-700 mb-3 cursor-pointer hover:bg-gray-200 p-3 rounded-lg transition-colors"
                    onClick={() => {
                      if (isAgent) {
                        setScreenshotData(image.data);
                        setShowScreenshotPreview(true);
                      } else {
                        setAgentImageData(image.data);
                        setShowAgentImagePreview(true);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={image.data}
                        alt="Thumbnail"
                        className="w-12 h-12 object-cover rounded-lg shadow-sm"
                      />
                      <span>Ảnh chụp lúc: {image.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center">
                  {isAgent
                    ? "Chưa có ảnh nào được gửi"
                    : "Chưa nhận được ảnh nào"}
                </p>
              )}
            </div>
          </div>
        )}
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
            } ${
              callStatus == "error" ? "opacity-50 cursor-not-allowed" : ""
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
            } ${
              callStatus == "error" ? "opacity-50 cursor-not-allowed" : ""
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
            } ${
              callStatus == "error" ? "opacity-50 cursor-not-allowed" : ""
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
              className={`p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200 ${
                callStatus == "error"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Chụp ảnh màn hình"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}

          {/* Recording (chỉ Agent) */}
          {isAgent && (
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-full transition-all duration-200 ${
                agentRecordingActive
                  ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              } ${
                callStatus == "error" ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={isRecording ? "Dừng ghi hình" : "Bắt đầu ghi hình"}
            >
              {isRecording ? (
                <Square className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
          )}

          <button
            onClick={() => setShowImagesPanel(!showImagesPanel)}
            className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
            title="Danh sách ảnh"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          {/* Leave Call */}
          <button
            onClick={() => handleLeaveCall(false)}
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
          {isAgent && (
            <span className="text-xs text-gray-400 w-14 text-center">
              {isRecording ? "Đang ghi" : "Ghi hình"}
            </span>
          )}
          <span className="text-xs text-gray-400 w-14 text-center">Ảnh</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="text-center text-white bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-700/50 transform animate-in fade-in-0 zoom-in-95 duration-300">
            {/* Header with Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-500/20 p-4 rounded-full border border-red-500/30">
                <Phone className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Cuộc gọi đã kết thúc
            </h2>
            {!isAgent && isParticipantInRoom && (
              <div className="space-y-6">
                {/* Rating Section */}
                <div className="text-left">
                  <label className="flex items-center gap-2 text-slate-200 mb-3 font-medium">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Đánh giá hỗ trợ:
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleStarClick(star)}
                          className="group transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-full p-1"
                        >
                          <Star
                            className={`w-8 h-8 transition-all duration-200 ${
                              star <= selectedRating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-500 hover:text-yellow-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-slate-700/50 px-4 py-2 rounded-full text-slate-200 font-medium border border-slate-600/50">
                        {selectedRating} sao - {ratingDescription}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="text-left">
                  <label className="flex items-center gap-2 text-slate-200 mb-3 font-medium">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Phản hồi thêm (tùy chọn):
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:bg-slate-700/70"
                    rows="4"
                    placeholder="Chia sẻ trải nghiệm của bạn về cuộc gọi này..."
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => {
                console.log("Dashboard button clicked with rating:", selectedRating, "feedback:", feedbackText)
                if(isAgent) {
                  onCallEnd()
                } else {
                  console.log("Calling onCallEnd with rating and feedback" + selectedRating + " - " + feedbackText + " for session " + sessionId);
                  if(isParticipantInRoom) onCallEnd(sessionId, selectedRating, feedbackText)
                  else onCallEnd()
                }
              }}
              className="group mt-8 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Quay lại Dashboard</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>
      )}
      {showScreenshotPreview && screenshotData && (
        <ScreenshotPreview
          screenshotData={screenshotData}
          onClose={() => {
            setShowScreenshotPreview(false);
            setScreenshotData(null);
          }}
          isAgent={isAgent}
          onEdit={() => handleEditImage(screenshotData)}
          onSend={() => handleSendImage(screenshotData)}
          image
          Source="screenshot"
        />
      )}
      {/* Popup gửi ảnh thành công */}
        {showSendSuccessPopup && (
          <div className="absolute bot-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <p className="text-sm font-medium">Gửi ảnh thành công</p>
          </div>
        )}
      {showPopup && (
          <div className="absolute bot-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <p className="text-sm font-medium">{message}</p>
          </div>
      )}
      {showAgentImagePreview && agentImageData && (
        <ScreenshotPreview
          screenshotData={agentImageData}
          onClose={() => {
            setShowAgentImagePreview(false);
            setAgentImageData(null);
          }}
          isAgent={isAgent}
          onEdit={() => handleEditImage(screenshotData)}
          onSend={() => handleSendImage(agentImageData)}
          imageSource="agent"
        />
      )}
      {/* Popup nhận được ảnh */}
      {showReceivedImagePopup && receivedImageData && (
        <div className="absolute bot-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Nhận được ảnh mới!</p>
            <button
              onClick={() => {
                setAgentImageData(receivedImageData);
                setShowAgentImagePreview(true);
                setShowReceivedImagePopup(false);
              }}
              className="bg-white text-blue-600 px-2 py-1 rounded text-xs hover:bg-gray-200"
            >
              Xem ảnh
            </button>
            <button
              onClick={() => setShowReceivedImagePopup(false)}
              className="bg-white text-blue-600 px-2 py-1 rounded text-xs hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {showImageEditor && editingImageData && (
        <ImageEditor
          imageData={editingImageData}
          onSave={(newImageData) => {
            setScreenshotData(newImageData);
            setShowScreenshotPreview(true);
            setShowImageEditor(false);
            setEditingImageData(null);
          }}
          onCancel={() => {
            setShowImageEditor(false);
            setEditingImageData(null);
            setShowScreenshotPreview(true);
          }}
        />
      )}

      {/* Modal thông báo khi participant khác cancel từ permission page */}
      {showPermissionCancelledModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Cuộc gọi bị hủy
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed text-center">
                {permissionCancelledMessage}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handlePermissionCancelledConfirmation}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors duration-200"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thông báo khi participant khác rời cuộc gọi */}
      {showCallEndedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Người tham gia đã rời
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed text-center">
                {callEndedMessage}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCallEndedConfirmation}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors duration-200"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
