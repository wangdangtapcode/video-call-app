import React, { useState, useEffect, useRef } from 'react';
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
  MoreVertical,
  Maximize,
  Minimize
} from 'lucide-react';

// Mock OpenVidu classes (in thực tế sẽ import từ openvidu-browser)
class MockOpenVidu {
  initSession(sessionId) {
    return new MockSession(sessionId);
  }
}

class MockSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.streamCreatedHandlers = [];
    this.streamDestroyedHandlers = [];
    this.sessionConnectedHandlers = [];
  }

  on(event, handler) {
    if (event === 'streamCreated') {
      this.streamCreatedHandlers.push(handler);
    } else if (event === 'streamDestroyed') {
      this.streamDestroyedHandlers.push(handler);
    } else if (event === 'sessionConnected') {
      this.sessionConnectedHandlers.push(handler);
    }
  }

  connect(token, userData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.sessionConnectedHandlers.forEach(handler => handler());
        resolve();
      }, 1000);
    });
  }

  publish(publisher) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.streamCreatedHandlers.forEach(handler => 
          handler({ stream: { streamManager: publisher } })
        );
        resolve();
      }, 500);
    });
  }

  disconnect() {
    console.log('Session disconnected');
  }
}

class MockPublisher {
  constructor(targetElement, properties) {
    this.targetElement = targetElement;
    this.properties = properties;
    this.videoEnabled = true;
    this.audioEnabled = true;
  }

  publishVideo(enabled) {
    this.videoEnabled = enabled;
  }

  publishAudio(enabled) {
    this.audioEnabled = enabled;
  }
}

const VideoCallRoom = () => {
  // States
  const [session, setSession] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscriber, setSubscriber] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, recording, ended
  const [userRole, setUserRole] = useState('user'); // user or agent
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const userVideoRef = useRef(null);
  const agentVideoRef = useRef(null);
  const OV = useRef(new MockOpenVidu());

  useEffect(() => {
    initializeSession();
    return () => {
      leaveSession();
    };
  }, []);

  const initializeSession = async () => {
    const session = OV.current.initSession();
    
    session.on('streamCreated', (event) => {
      const subscriber = session.subscribe(event.stream, undefined);
      setSubscriber(subscriber);
      setCallStatus('connected');
    });

    session.on('streamDestroyed', (event) => {
      setSubscriber(null);
    });

    setSession(session);

    try {
      // Giả lập kết nối với token từ backend
      await session.connect('mock-token', { role: userRole });
      
      // Tạo publisher (video của mình)
      const publisher = new MockPublisher(undefined, {
        audioSource: undefined,
        videoSource: undefined,
        publishAudio: true,
        publishVideo: true,
        resolution: '1280x720',
        frameRate: 30,
        insertMode: 'APPEND',
        mirror: false
      });

      await session.publish(publisher);
      setPublisher(publisher);
      
    } catch (error) {
      console.error('Error connecting to session:', error);
    }
  };

  const toggleVideo = () => {
    if (publisher) {
      publisher.publishVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (publisher) {
      publisher.publishAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleScreenShare = () => {
    // Logic chia sẻ màn hình sẽ được implement với OpenVidu
    setIsScreenSharing(!isScreenSharing);
  };

  const takeScreenshot = () => {
    // Logic chụp ảnh màn hình (chỉ Agent)
    if (userRole === 'agent') {
      // Implement screenshot logic
      console.log('Taking screenshot...');
    }
  };

  const toggleRecording = () => {
    // Logic bắt đầu/kết thúc recording
    setIsRecording(!isRecording);
    setCallStatus(isRecording ? 'connected' : 'recording');
  };

  const leaveSession = () => {
    if (session) {
      session.disconnect();
      setSession(null);
      setPublisher(null);
      setSubscriber(null);
      setCallStatus('ended');
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
      case 'connecting': return 'bg-yellow-500';
      case 'connected': return 'bg-green-500';
      case 'recording': return 'bg-red-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Đang kết nối...';
      case 'connected': return 'Đã kết nối';
      case 'recording': return 'Đang ghi hình';
      case 'ended': return 'Cuộc gọi đã kết thúc';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header với trạng thái */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
          <span className="text-white font-medium">{getStatusText()}</span>
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
              <Circle className="w-3 h-3 text-white fill-current animate-pulse" />
              <span className="text-white text-sm font-medium">REC</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-gray-300 text-sm">
            {userRole === 'user' ? 'User' : 'Agent'} View
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative p-4 bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* User Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
            <div 
              ref={userVideoRef}
              className="w-full h-full bg-gray-700 flex items-center justify-center"
            >
              {isVideoEnabled ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-6xl font-bold">
                  U
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  <VideoOff className="w-16 h-16 mx-auto mb-4" />
                  <p>Camera tắt</p>
                </div>
              )}
            </div>
            
            {/* User Label */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">User</span>
            </div>
            
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Agent Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
            <div 
              ref={agentVideoRef}
              className="w-full h-full bg-gray-700 flex items-center justify-center"
            >
              {subscriber ? (
                <div className="w-full h-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-6xl font-bold">
                  A
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl">A</span>
                  </div>
                  <p>Đang chờ Agent...</p>
                </div>
              )}
            </div>
            
            {/* Agent Label */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">Agent</span>
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
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all duration-200 ${
              isAudioEnabled
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all duration-200 ${
              isScreenSharing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            <Monitor className="w-6 h-6" />
          </button>

          {/* Screenshot (chỉ Agent) */}
          {userRole === 'agent' && (
            <button
              onClick={takeScreenshot}
              className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}

          {/* Recording */}
          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
          </button>

          {/* Leave Call */}
          <button
            onClick={leaveSession}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 ml-8"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Control Labels */}
        <div className="flex justify-center items-center space-x-4 mt-2">
          <span className="text-xs text-gray-400 w-14 text-center">
            {isVideoEnabled ? 'Camera' : 'Tắt cam'}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">
            {isAudioEnabled ? 'Micro' : 'Tắt mic'}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">
            {isScreenSharing ? 'Đang chia sẻ' : 'Chia sẻ'}
          </span>
          {userRole === 'agent' && (
            <span className="text-xs text-gray-400 w-14 text-center">Chụp ảnh</span>
          )}
          <span className="text-xs text-gray-400 w-14 text-center">
            {isRecording ? 'Đang ghi' : 'Ghi hình'}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center ml-8">Rời phòng</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-96">
            <h3 className="text-white text-lg font-semibold mb-4">Cài đặt</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Vai trò</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Chất lượng video</label>
                <select className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg">
                  <option value="720p">HD (720p)</option>
                  <option value="1080p">Full HD (1080p)</option>
                  <option value="480p">SD (480p)</option>
                </select>
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
    </div>
  );
};

export default VideoCallRoom;