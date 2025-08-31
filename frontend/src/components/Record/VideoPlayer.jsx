import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoPlayer = ({ url, segments }) => {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  useEffect(() => {
    const player = videojs(playerRef.current, {
      controls: false, // Disable default controls for custom UI
      autoplay: false,
      sources: [{ src: url, type: 'video/mp4' }],
    });

    const handleLoadedMetadata = () => {
      setDuration(player.duration());
      if (segments && segments.length > 0) {
        player.currentTime(segments[0].startOffsetSeconds || 0);
      }
    };

    const handleTimeUpdate = () => {
      const current = player.currentTime();
      setCurrentTime(current);

      const currentSegment = segments[currentSegmentIndex];
      if (currentSegment) {
        const endTime = currentSegment.endOffsetSeconds || 
          (segments[currentSegmentIndex + 1]?.startOffsetSeconds || duration);
        if (current >= endTime) {
          player.pause();
          setIsPlaying(false);
          if (currentSegmentIndex + 1 < segments.length) {
            setCurrentSegmentIndex(currentSegmentIndex + 1);
            player.currentTime(segments[currentSegmentIndex + 1].startOffsetSeconds || 0);
          }
        }
      }
    };

    player.on('loadedmetadata', handleLoadedMetadata);
    player.on('timeupdate', handleTimeUpdate);

    return () => {
      if (player) {
        player.dispose();
      }
    };
  }, [url, segments]);

  const playTrimmedVideo = () => {
    const player = videojs(playerRef.current);
    if (segments && segments.length > 0) {
      const currentSegment = segments[currentSegmentIndex];
      const endTime = currentSegment.endOffsetSeconds || 
        (segments[currentSegmentIndex + 1]?.startOffsetSeconds || duration);
      if (currentTime < currentSegment.startOffsetSeconds || currentTime >= endTime) {
        player.currentTime(currentSegment.startOffsetSeconds || 0);
      }
      player.play();
      setIsPlaying(true);
    }
  };

  const pauseVideo = () => {
    const player = videojs(playerRef.current);
    player.pause();
    setIsPlaying(false);
  };

  const resetVideo = () => {
    const player = videojs(playerRef.current);
    if (segments && segments.length > 0) {
      setCurrentSegmentIndex(0);
      player.currentTime(segments[0].startOffsetSeconds || 0);
      player.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!segments || segments.length === 0) return 0;
    const currentSegment = segments[currentSegmentIndex];
    const start = currentSegment.startOffsetSeconds || 0;
    const end = currentSegment.endOffsetSeconds || 
      (segments[currentSegmentIndex + 1]?.startOffsetSeconds || duration);
    if (currentTime < start) return 0;
    if (currentTime > end) return 100;
    return ((currentTime - start) / (end - start)) * 100;
  };

  const totalSegmentDuration = segments.reduce((acc, segment, index) => {
    const end = segment.endOffsetSeconds || 
      (segments[index + 1]?.startOffsetSeconds || duration);
    return acc + (end - (segment.startOffsetSeconds || 0));
  }, 0);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg font-sans">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 flex items-center justify-center gap-2">
        <Play size={32} />
        Phát video segments
      </h1>

      {/* Video Player */}
      <div className="mb-6">
        <video
          ref={playerRef}
          className="w-full rounded-lg shadow-md"
          preload="metadata"
        >
          <source src={url} type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ video HTML5.
        </video>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{totalSegmentDuration.toFixed(1)}s (tổng đoạn)</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Điều khiển video</h2>
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={isPlaying ? pauseVideo : playTrimmedVideo}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            {isPlaying ? (
              <>
                <Pause size={20} />
                Tạm dừng
              </>
            ) : (
              <>
                <Play size={20} />
                Phát đoạn
              </>
            )}
          </button>

          <button
            onClick={resetVideo}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            <RotateCcw size={20} />
            Reset
          </button>
        </div>
      </div>

      {/* Video Info */}
      <div className="text-center text-gray-500">
        <p>Video gốc: {duration ? formatTime(duration) : 'Đang tải...'}</p>
        <p>Trạng thái: {isPlaying ? 'Đang phát' : 'Đã dừng'}</p>
      </div>
    </div>
  );
};

export default VideoPlayer;