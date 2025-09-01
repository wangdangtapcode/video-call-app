import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from 'lucide-react';

const VideoPlayer = ({ videoUrl, startTime, endTime }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [lastVolume, setLastVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const duration = endTime - startTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = startTime || 0;
    video.playbackRate = playbackRate;
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;

    const handleTimeUpdate = () => {
      const adjustedTime = video.currentTime - (startTime || 0);
      setCurrentTime(adjustedTime);

      if (video.currentTime >= (endTime || video.duration)) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = endTime || video.duration;
        setCurrentTime(duration || video.duration - (startTime || 0));
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [startTime, endTime, duration]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Auto-hide controls
  useEffect(() => {
    let timeout;
    if (isPlaying && showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime >= (endTime || video.duration)) {
        video.currentTime = startTime || 0;
        setCurrentTime(0);
      }
      video.play();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(lastVolume);
    } else {
      setLastVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration + (startTime || 0);
    video.currentTime = newTime;
    setCurrentTime(newTime - (startTime || 0));
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) {
      setLastVolume(newVolume);
    }
  };

  const skipTime = (seconds) => {
    const video = videoRef.current;
    const newTime = Math.max(startTime || 0, Math.min(video.currentTime + seconds, endTime || video.duration));
    video.currentTime = newTime;
    setCurrentTime(newTime - (startTime || 0));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="relative w-full h-full bg-transparent backdrop-blur-sm"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm z-10 rounded-xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-white text-sm">Đang tải video...</p>
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          src={videoUrl}
          onError={(e) => console.error("Video loading error:", e)}
          onClick={togglePlay}
          style={{ aspectRatio: '16/9' }}
        >
          Your browser does not support the video tag.
        </video>

        {/* Play/Pause Overlay */}
        {!isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            {!isPlaying && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 bg-opacity-90 backdrop-blur-sm rounded-full p-6 hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl">
                <Play className="h-16 w-16 text-white ml-2" fill="currentColor" />
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent backdrop-blur-md rounded-b-xl transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="px-6 py-3">
            <div 
              className="w-full h-2 bg-white bg-opacity-20 rounded-full cursor-pointer hover:h-3 transition-all backdrop-blur-sm"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all shadow-lg"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-6">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </button>

              {/* Skip Buttons */}
              <button
                onClick={() => skipTime(-10)}
                className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                onClick={() => skipTime(10)}
                className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110"
              >
                <SkipForward className="h-6 w-6" />
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110"
                >
                  {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider backdrop-blur-sm"
                />
              </div>

              {/* Time Display */}
              <span className="text-white text-lg font-mono bg-black bg-opacity-20 px-3 py-1 rounded-lg backdrop-blur-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Playback Speed */}
              <div className="relative group">
                <button className="text-white hover:text-indigo-400 transition-colors text-lg font-medium px-3 py-1 border border-white border-opacity-20 rounded-lg bg-black bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30">
                  {playbackRate}x
                </button>
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto shadow-xl border border-white border-opacity-10">
                  <div className="flex flex-col space-y-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`text-sm px-4 py-2 rounded transition-colors whitespace-nowrap ${
                          playbackRate === rate 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                            : 'text-white hover:bg-white hover:bg-opacity-20'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110"
              >
                {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transition: all 0.2s ease;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transition: all 0.2s ease;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }
        .slider::-webkit-slider-track {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          height: 8px;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;