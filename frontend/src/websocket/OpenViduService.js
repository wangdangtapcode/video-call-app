import { OpenVidu } from "openvidu-browser";
import axios from "axios";
class OpenViduService {
  constructor() {
    this.OV = null;
    this.session = null;
    this.publisher = null;
    this.subscribers = [];
    this.mySessionId = null;
    this.myUserName = null;
    this.token = null;

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

      // Enable OpenVidu logs (optional)
      this.OV.enableProdMode();

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

      // Connect to session
      await this.session.connect(openviduToken, {
        clientData: JSON.stringify({
          userName: this.myUserName,
          ...connectionData,
        }),
      });

      console.log("Successfully connected to OpenVidu session");
      return true;
    } catch (error) {
      console.error("Error connecting to session:", error);
      throw error;
    }
  }

  /**
   * Create and publish video/audio stream
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

      // Create publisher
      this.publisher = await this.OV.initPublisherAsync(undefined, {
        audioSource: audioSource,
        videoSource: videoSource,
        publishAudio: audioEnabled,
        publishVideo: videoEnabled,
        resolution: "1280x720",
        frameRate: 30,
        insertMode: "APPEND",
        mirror: false,
      });

      // Publish stream
      await this.session.publish(this.publisher);

      console.log("Successfully published stream");
      return this.publisher;
    } catch (error) {
      console.error("Error publishing stream:", error);
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

      // Subscribe to the stream
      const subscriber = this.session.subscribe(event.stream, undefined);
      this.subscribers.push(subscriber);

      if (callbacks.onStreamCreated) {
        callbacks.onStreamCreated(event, subscriber);
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
      if (this.session) {
        this.session.disconnect();
      }

      // Cleanup
      this.session = null;
      this.publisher = null;
      this.subscribers = [];

      console.log("Left OpenVidu session");
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  }

  /**
   * Get session token from backend
   */
  async getTokenFromBackend() {
    try {
      // For development, you can use direct OpenVidu Server calls
      // In production, this should go through your backend

      const sessionResponse = await this.createSession();
      const tokenResponse = await this.createToken(sessionResponse);

      return tokenResponse;
    } catch (error) {
      console.error("Error getting token from backend:", error);
      throw error;
    }
  }

  /**
   * Create session on OpenVidu Server (should be done by backend in production)
   */
  async createSession() {
    try {
      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/sessions`,
        {
          customSessionId: this.mySessionId,
        }
      );

      if (response.status === 200) {
        const data = response.data;
        return data.sessionId;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  /**
   * Create token for session (should be done by backend in production)
   */
  async createToken(sessionId) {
    try {
      const response = await axios.post(
        `${this.APPLICATION_SERVER_URL}/api/openvidu/sessions/${sessionId}/connections`,
        {
          role: "PUBLISHER",
          data: JSON.stringify({
            userName: this.myUserName,
            timestamp: Date.now(),
          }),
        }
      );

      if (response.status === 200) {
        const data = response.data;
        return data.token;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
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
}

export default OpenViduService;
