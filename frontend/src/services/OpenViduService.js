import { OpenVidu } from "openvidu-browser";
import axios from "axios";
import { head } from "framer-motion/client";

class OpenViduService {
  constructor() {
    this.OV = null;
    this.session = null;
    this.publisher = null;
    this.subscribers = [];
    this.mySessionId = null;
    this.myUserName = null;
    this.token = null;
    this.recordingId = null;

    console.log("OpenViduService initializedddddddddddddddddddddd");
    // OpenVidu Server URL (chú ý: HTTPS cho production)
    this.OPENVIDU_SERVER_URL = "http://localhost:4443";
    this.OPENVIDU_SERVER_SECRET = "MY_SECRET"; // Thay bằng secret thực tế
    this.APPLICATION_SERVER_URL = "http://localhost:8081";
  }

  /**
   * Initialize OpenVidu session
   */
  async initSession(sessionId, userName, token) {
    try {
      this.mySessionId = sessionId;
      this.myUserName = userName;
      this.token = token;

      // Initialize OpenVidu object
      this.OV = new OpenVidu();

      // Enable OpenVidu logs cho development
      console.log("OpenVidu initialized");
      // // console.log("Platform detected:", this.OV.getDeviceName());
      // console.log("openvidu-browser version:", this.OV.getVersion());

      // Initialize session
      this.session = this.OV.initSession();

      return this.session;
    } catch (error) {
      console.error("Error initializing OpenVidu session:", error);
      throw error;
    }
  }

  /**
   * Connect to session with token
   */
  async connectToSession(connectionData = {}) {
    try {
      if (!this.session) {
        throw new Error("Session not initialized");
      }

      // Get connection token from backend
      const openviduToken = await this.getTokenFromBackend();

      // Connect to session với timeout
      const connectPromise = this.session.connect(openviduToken, {
        clientData: JSON.stringify({
          userName: this.myUserName,
          ...connectionData,
        }),
      });

      // Thêm timeout để tránh treo
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      console.log("Successfully connected to OpenVidu session");
      return true;
    } catch (error) {
      console.error("Error connecting to session:", error);
      throw error;
    }
  }

  /**
   * Create and publish video/audio stream với error handling tốt hơn
   */
  async publishStream(
    videoEnabled = true,
    audioEnabled = true,
    videoSource = undefined,
    audioSource = undefined
  ) {
    try {
      if (!this.session) {
        throw new Error("Session not connected");
      }

      // Kiểm tra quyền truy cập media trước
      await this.checkMediaPermissions(videoEnabled, audioEnabled);

      // Tạo publisher với cấu hình cụ thể
      const publisherOptions = {
        audioSource: audioSource,
        videoSource: videoSource,
        publishAudio: audioEnabled,
        publishVideo: videoEnabled,
        resolution: "640x480", // Giảm resolution để tránh lỗi
        frameRate: 30,
        insertMode: "APPEND",
        mirror: false,
      };

      console.log("Creating publisher with options:", publisherOptions);

      this.publisher = await this.OV.initPublisherAsync(
        undefined,
        publisherOptions
      );

      // Publish stream
      await this.session.publish(this.publisher);

      console.log("Successfully published stream");
      return this.publisher;
    } catch (error) {
      console.error("Error publishing stream:", error);

      // Xử lý các loại lỗi cụ thể
      if (error.name === "DEVICE_ACCESS_DENIED") {
        throw new Error(
          "Không thể truy cập camera/microphone. Vui lòng cấp quyền và thử lại."
        );
      } else if (error.name === "DEVICE_ALREADY_IN_USE") {
        throw new Error(
          "Camera/microphone đang được sử dụng bởi ứng dụng khác."
        );
      } else if (error.name === "NO_INPUT_SOURCE_SET") {
        throw new Error("Không tìm thấy thiết bị camera/microphone.");
      }

      throw error;
    }
  }

  /**
   * Kiểm tra quyền truy cập media
   */
  async checkMediaPermissions(video = true, audio = true) {
    try {
      const constraints = {};
      if (video) constraints.video = true;
      if (audio) constraints.audio = true;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Dọn dẹp stream ngay lập tức
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error) {
      console.error("Media permission error:", error);

      if (error.name === "NotAllowedError") {
        throw new Error("Vui lòng cấp quyền truy cập camera và microphone");
      } else if (error.name === "NotFoundError") {
        throw new Error("Không tìm thấy thiết bị camera hoặc microphone");
      } else if (error.name === "NotReadableError") {
        throw new Error(
          "Không thể truy cập thiết bị (có thể đang được sử dụng)"
        );
      }

      throw error;
    }
  }

  /**
   * Subscribe to stream events
   */
  subscribeToEvents(callbacks = {}) {
    if (!this.session) {
      console.error("Session not initialized");
      return;
    }

    // Stream created event
    this.session.on("streamCreated", (event) => {
      console.log("Stream created:", event.stream);

      try {
        // Subscribe to the stream với targetElement là undefined để manual attach
        const subscriber = this.session.subscribe(event.stream, undefined);
        this.subscribers.push(subscriber);

        // Set up event listeners before attaching
        subscriber.on("videoElementCreated", (videoEvent) => {
          console.log("Subscriber video element created");
        });

        subscriber.on("streamPlaying", (videoEvent) => {
          console.log("Subscriber stream playing successfully");
        });

        // Handle the streamPlaying timeout more gracefully
        subscriber.on("exception", (exception) => {
          if (exception.name === "NO_STREAM_PLAYING_EVENT") {
            console.warn("Subscriber stream playing timeout - ignoring");
          }
        });

        if (callbacks.onStreamCreated) {
          callbacks.onStreamCreated(event, subscriber);
        }
      } catch (error) {
        console.error("Error subscribing to stream:", error);
      }
    });

    // Stream destroyed event
    this.session.on("streamDestroyed", (event) => {
      console.log("Stream destroyed:", event.stream);

      // Remove subscriber from array
      this.subscribers = this.subscribers.filter(
        (sub) => sub !== event.stream.streamManager
      );

      if (callbacks.onStreamDestroyed) {
        callbacks.onStreamDestroyed(event);
      }
    });

    // Session disconnected event
    this.session.on("sessionDisconnected", (event) => {
      console.log("Session disconnected:", event);

      if (callbacks.onSessionDisconnected) {
        callbacks.onSessionDisconnected(event);
      }
    });

    // Connection created event
    this.session.on("connectionCreated", (event) => {
      console.log("Connection created:", event.connection);

      if (callbacks.onConnectionCreated) {
        callbacks.onConnectionCreated(event);
      }
    });

    // Connection destroyed event
    this.session.on("connectionDestroyed", (event) => {
      console.log("Connection destroyed:", event.connection);

      if (callbacks.onConnectionDestroyed) {
        callbacks.onConnectionDestroyed(event);
      }
    });

    // Exception event
    this.session.on("exception", (exception) => {
      console.error("OpenVidu exception:", exception);

      // Handle specific exception types
      if (exception.name === "NO_STREAM_PLAYING_EVENT") {
        console.warn("Stream playing timeout - this is usually not critical");
        // Don't treat this as a fatal error
        return;
      }

      if (callbacks.onException) {
        callbacks.onException(exception);
      }
    });

    // Signal events (for custom messaging)
    this.session.on("signal", (event) => {
      console.log("Signal received:", event);

      if (callbacks.onSignal) {
        callbacks.onSignal(event);
      }
    });
  }

  /**
   * Toggle video publication
   */
  toggleVideo() {
    if (this.publisher) {
      this.publisher.publishVideo(!this.publisher.stream.videoActive);
      return this.publisher.stream.videoActive;
    }
    return false;
  }

  /**
   * Toggle audio publication
   */
  toggleAudio() {
    if (this.publisher) {
      this.publisher.publishAudio(!this.publisher.stream.audioActive);
      return this.publisher.stream.audioActive;
    }
    return false;
  }

  /**
   * Send signal to other participants
   */
  sendSignal(type, data, to = []) {
    if (this.session) {
      this.session
        .signal({
          type: type,
          data: JSON.stringify(data),
          to: to,
        })
        .catch((error) => {
          console.error("Error sending signal:", error);
        });
    }
  }

  /**
   * Replace video track (for screen sharing)
   */
  async replaceTrack(videoSource) {
    try {
      if (this.publisher) {
        const newPublisher = await this.OV.initPublisherAsync(undefined, {
          videoSource: videoSource,
          publishAudio: true,
          publishVideo: true,
          mirror: false,
        });

        await this.session.unpublish(this.publisher);
        await this.session.publish(newPublisher);

        this.publisher = newPublisher;
        return newPublisher;
      }
    } catch (error) {
      console.error("Error replacing track:", error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    try {
      const videoSource = navigator.mediaDevices.getDisplayMedia
        ? "screen"
        : navigator.getDisplayMedia
        ? "screen"
        : false;

      if (!videoSource) {
        throw new Error("Screen sharing not supported");
      }

      return await this.replaceTrack(videoSource);
    } catch (error) {
      console.error("Error starting screen share:", error);
      throw error;
    }
  }

  /**
   * Stop screen sharing and return to camera
   */
  async stopScreenShare() {
    try {
      return await this.replaceTrack(undefined); // undefined = default camera
    } catch (error) {
      console.error("Error stopping screen share:", error);
      throw error;
    }
  }

  /**
   * Leave session and cleanup
   */
  leaveSession() {
    try {
      console.log("Starting OpenVidu session cleanup...");

      // Stop all tracks from publisher if exists
      if (this.publisher && this.publisher.stream) {
        this.publisher.stream
          .getMediaStream()
          .getTracks()
          .forEach((track) => {
            track.stop();
            console.log("Stopped track:", track.kind);
          });
      }

      // Stop all tracks from subscribers
      this.subscribers.forEach((subscriber) => {
        if (subscriber.stream && subscriber.stream.getMediaStream()) {
          subscriber.stream
            .getMediaStream()
            .getTracks()
            .forEach((track) => {
              track.stop();
              console.log("Stopped subscriber track:", track.kind);
            });
        }
      });

      // Disconnect from session
      if (this.session) {
        console.log("Disconnecting from session:", this.mySessionId);
        this.session.disconnect();
      }

      // Cleanup all references
      this.session = null;
      this.publisher = null;
      this.subscribers = [];
      this.mySessionId = null;
      this.myUserName = null;
      this.token = null;

      console.log("OpenVidu session cleanup completed successfully");
    } catch (error) {
      console.error("Error during session cleanup:", error);

      // Force cleanup even if there are errors
      this.session = null;
      this.publisher = null;
      this.subscribers = [];
      this.mySessionId = null;
      this.myUserName = null;
      this.token = null;
    }
  }

  /**
   * Force cleanup without attempting to disconnect (for emergency cases)
   */
  forceCleanup() {
    console.log("Force cleanup initiated...");

    try {
      // Stop all media tracks immediately
      if (this.publisher && this.publisher.stream) {
        this.publisher.stream
          .getMediaStream()
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      this.subscribers.forEach((subscriber) => {
        if (subscriber.stream && subscriber.stream.getMediaStream()) {
          subscriber.stream
            .getMediaStream()
            .getTracks()
            .forEach((track) => {
              track.stop();
            });
        }
      });
    } catch (error) {
      console.warn("Error stopping tracks during force cleanup:", error);
    }

    // Force reset all properties
    this.session = null;
    this.publisher = null;
    this.subscribers = [];
    this.mySessionId = null;
    this.myUserName = null;
    this.token = null;

    console.log("Force cleanup completed");
  }

  /**
   * Get session token from backend
   */
  async getTokenFromBackend() {
    try {
      console.log("Getting token from backend for session:", this.mySessionId);

      // Create session through backend
      const sessionResponse = await this.createSession();
      console.log("Session created:", sessionResponse);

      // Create token through backend
      const tokenResponse = await this.createToken(sessionResponse);
      console.log("Token created:", tokenResponse);

      return tokenResponse;
    } catch (error) {
      console.error("Error getting token from backend:", error);
      throw new Error(`Backend connection failed: ${error.message}`);
    }
  }

  /**
   * Create session via backend
   */
  async createSession() {
    try {
      console.log(
        "Creating session via backend with sessionId:",
        this.mySessionId
      );

      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/sessions`,
        {
          customSessionId: this.mySessionId,
        },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Backend session response:", response.data);

      if (response.status === 200 && response.data.sessionId) {
        return response.data.sessionId;
      }

      throw new Error(`Invalid response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (error.response) {
        console.error("Backend session creation error:", error.response.data);
        throw new Error(
          `Backend error: ${
            error.response.data.error || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("Network error creating session:", error.message);
        throw new Error("Cannot connect to backend server");
      } else {
        console.error("Error creating session:", error.message);
        throw error;
      }
    }
  }

  /**
   * Create token for session via backend
   */
  async createToken(sessionId) {
    try {
      console.log("Creating token via backend for session:", sessionId);

      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/sessions/${sessionId}/connection`,
        {
          // role: "PUBLISHER",
          // data: JSON.stringify({
          //   userName: this.myUserName,
          //   timestamp: Date.now(),
          // }),
        },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Backend token response:", response.data);

      if (response.status === 200 && response.data.token) {
        return response.data.token;
      }

      throw new Error(
        `Invalid token response: ${JSON.stringify(response.data)}`
      );
    } catch (error) {
      if (error.response) {
        console.error("Backend token creation error:", error.response.data);
        throw new Error(
          `Backend error: ${
            error.response.data.error || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("Network error creating token:", error.message);
        throw new Error("Cannot connect to backend server");
      } else {
        console.error("Error creating token:", error.message);
        throw error;
      }
    }
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      sessionId: this.mySessionId,
      userName: this.myUserName,
      isConnected: this.session && this.session.connection,
      isPublishing: !!this.publisher,
      subscribersCount: this.subscribers.length,
      connectionId: this.session?.connection?.connectionId,
    };
  }

  /**
   * Kiểm tra kết nối tới Backend Server
   */
  async checkServerConnection() {
    try {
      const response = await axios.get(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/health`,
        {
          timeout: 5000,
        }
      );

      console.log("Backend health check:", response.data);
      return response.status === 200;
    } catch (error) {
      console.error("Backend server connection check failed:", error);
      return false;
    }
  }

  /**
   * Recording Function
   */
  async startRecording(agentId, userId) {
    try {
      console.log("Start recording with sessionId: ", this.mySessionId);
      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/recording/start/${this.mySessionId}?agentId=${agentId}&userId=${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      this.recordingId = response.data.recordingId;
      console.log("Recording ID:", this.recordingId);
      console.log("Recording started:", response.data);
      return this.mySessionId;
    } catch (error) {
      throw error;
    }
  }
  async stopRecording() {
    try {
      console.log("Stop recording with id: ", this.recordingId);
      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/recording/stop/${this.recordingId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Recording stopped:", response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default OpenViduService;
