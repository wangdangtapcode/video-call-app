import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";
import axios from "axios";
import VideoPlayer from "../../components/Record/VideoPlayer";
import { useNavigate } from "react-router-dom";

export const AgentRecord = () => {
  const { user, token } = useUser();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:8081/api/record/filter", {
          params: { agentId: user.id },
          headers: { Authorization: `Bearer ${token}` },
        });
        const filteredRecordings = (response.data.content || []).filter(rec => rec.segments.length > 0);
        setRecordings(filteredRecordings);
      } catch (err) {
        setError("Không thể tải lịch sử cuộc gọi. Vui lòng thử lại.");
        console.error("Error fetching recordings:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchRecordings();
    } else {
      navigate("/login");
    }
  }, [user, token, navigate]);

  const handlePlaySegments = (recording) => {
    setSelectedRecording(recording);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedRecording(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-600">Đang tải lịch sử cuộc gọi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Không có lịch sử cuộc gọi nào với segments.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundImage: 'ur[](https://via.placeholder.com/1920x1080.png?text=Grass+Background)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Lịch sử cuộc gọi</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((recording) => (
            <div key={recording.databaseId} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="relative">
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Thumbnail</span>
                </div>
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {recording.status}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{recording.recordingId}</h3>
                <p className="text-sm text-gray-600">Session: {recording.sessionId}</p>
                <p className="text-sm text-gray-600">Duration: {recording.duration} giây</p>
                <p className="text-xs text-gray-500">
                  {new Date(recording.startedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <button
                  onClick={() => handlePlaySegments(recording)}
                  className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Phát video
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showPlayer && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Phát video segments</h2>
              <button onClick={handleClosePlayer} className="text-gray-500 hover:text-gray-700">
                Đóng
              </button>
            </div>
            <VideoPlayer url={selectedRecording.url} segments={selectedRecording.segments} />
          </div>
        </div>
      )}
    </div>
  );
};