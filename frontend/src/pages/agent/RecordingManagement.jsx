import React, { useState, useEffect } from "react";
import axios from "axios";
import VideoPlayer from "../../components/Record/VideoPlayer";
import { useUser } from "../../context/UserContext";
import { Calendar, Clock, Play, X, Video, Search } from "lucide-react";

const RecordingManagement = () => {
  const [recordings, setRecordings] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUser();

  useEffect(() => {
    if (
      filterMode === "date-range" ||
      (filterMode === "all" && recordings.length === 0)
    ) {
      const fetchRecordings = async () => {
        try {
          const response = await axios.get(
            "http://localhost:8081/api/record/filter",
            {
              params: {
                id: user.id,
                startDate,
                endDate,
              },
            }
          );
          console.log("Fetched recordings:", response.data);
          setRecordings(response.data.content);
        } catch (error) {
          console.error("Error fetching recordings:", error);
        }
      };

      fetchRecordings();
    }
  }, [startDate, endDate, filterMode, user.id]);

  const allSegments = recordings.flatMap((recording) =>
    recording.segments.map((segment, index) => ({
      ...segment,
      recordingUrl: recording.url,
      recordingId: recording.recordingId,
      duration: segment.endOffsetSeconds - segment.startOffsetSeconds,
      segmentNumber: index + 1,
      totalSegments: recording.segments.length,
    }))
  );

  const filteredSegments = allSegments.filter((segment) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!segment.recordingId.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filterMode === "date-range") {
      const segmentDate = new Date(segment.segmentStartTime)
        .toISOString()
        .split("T")[0];
      return segmentDate >= startDate && segmentDate <= endDate;
    }

    return true;
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")} mins`;
  };

  const handlePlay = (segment) => {
    setSelectedSegment({
      url: segment.recordingUrl,
      startTime: segment.startOffsetSeconds,
      endTime: segment.endOffsetSeconds,
      title:
        segment.totalSegments > 1
          ? `Record cuộc gọi ${segment.recordingId} - bản ghi thứ ${segment.segmentNumber}`
          : `Record cuộc gọi ${segment.recordingId}`,
    });
  };

  const handleClose = () => {
    setSelectedSegment(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Video className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Xem lại record</h1>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID cuộc gọi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-700">Lọc:</span>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filterMode"
                      value="all"
                      checked={filterMode === "all"}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-gray-700">Tất cả</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filterMode"
                      value="date-range"
                      checked={filterMode === "date-range"}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-gray-700">Thời gian</span>
                  </label>
                </div>
              </div>
            </div>

            {filterMode === "date-range" && (
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Hiển thị{" "}
            <span className="font-semibold text-indigo-600">
              {filteredSegments.length}
            </span>{" "}
            video
            {filterMode === "date-range" && ` từ ${startDate} đến ${endDate}`}
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSegments.map((segment) => {
            const title =
              segment.totalSegments > 1
                ? `Record cuộc gọi ${segment.recordingId} - bản ghi thứ ${segment.segmentNumber}`
                : `Record cuộc gọi ${segment.recordingId}`;

            return (
              <div
                key={`${segment.recordingId}-${segment.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-xl transition-all duration-300 border border-gray-100"
                onClick={() => handlePlay(segment)}
              >
                <div className="relative aspect-video bg-gray-900">
                  <video
                    className="w-full h-full object-cover"
                    src={segment.recordingUrl}
                    muted
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white bg-opacity-90 rounded-full p-4">
                      <Play
                        className="h-8 w-8 text-indigo-600 ml-1"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(segment.duration)}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(segment.segmentStartTime).toLocaleDateString(
                      "vi-VN"
                    )}{" "}
                    -{" "}
                    {new Date(segment.segmentStartTime).toLocaleTimeString(
                      "vi-VN"
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSegments.length === 0 && (
          <div className="text-center py-12">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Không tìm thấy video nào
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Thử thay đổi từ khóa tìm kiếm"
                : "Thử thay đổi bộ lọc thời gian"}
            </p>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedSegment && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50/70 to-indigo-100/70 backdrop-blur-sm flex flex-col items-center z-50">
            <div className="relative w-full max-w-6xl max-h-[90vh] p-6 flex flex-col">
              {/* Header pinned to top */}
              <div className="w-full bg-gradient-to-r from-blue-100/100 to-indigo-200/40 backdrop-blur-md rounded-xl p-4 border border-indigo-200/30 shadow-sm mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100/50 rounded-lg">
                      <Video className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 truncate">
                      {selectedSegment.title}
                    </h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-700 hover:text-gray-900 hover:bg-indigo-100/30 transition-all p-2 rounded-lg"
                  >
                    <X className="h-8 w-8" />
                  </button>
                </div>
              </div>

              {/* Video Player Container centered vertically */}
              <div className="flex-1 flex items-center justify-center relative">
                {/* Decorative gradient orbs (more transparent) */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-200/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/05 rounded-full blur-3xl"></div>

                {/* Video container with more transparent glass effect */}
                <div className="relative w-full max-w-6xl max-h-full bg-white/15 backdrop-blur-lg rounded-2xl border border-indigo-200/30 overflow-hidden shadow-lg">
                  <VideoPlayer
                    videoUrl={selectedSegment.url}
                    startTime={selectedSegment.startTime}
                    endTime={selectedSegment.endTime}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingManagement;
