// OpenVidu Configuration
export const OPENVIDU_CONFIG = {
  // Development configuration
  SERVER_URL:
    process.env.REACT_APP_OPENVIDU_SERVER_URL || "https://localhost:4443",
  SERVER_SECRET: process.env.REACT_APP_OPENVIDU_SERVER_SECRET || "MY_SECRET",

  // Session configuration
  DEFAULT_SESSION_PROPERTIES: {
    customSessionId: "",
    recordingMode: "MANUAL",
    defaultRecordingProperties: {
      hasAudio: true,
      hasVideo: true,
      outputMode: "COMPOSED",
      recordingLayout: "BEST_FIT",
    },
  },

  // Publisher configuration
  DEFAULT_PUBLISHER_PROPERTIES: {
    audioSource: undefined,
    videoSource: undefined,
    publishAudio: true,
    publishVideo: true,
    resolution: "1280x720",
    frameRate: 30,
    insertMode: "APPEND",
    mirror: false,
  },

  // Video quality settings
  VIDEO_QUALITIES: {
    LOW: { width: 640, height: 480, frameRate: 15 },
    MEDIUM: { width: 1280, height: 720, frameRate: 30 },
    HIGH: { width: 1920, height: 1080, frameRate: 30 },
  },
};
