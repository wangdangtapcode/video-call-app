import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminRecord = () => {
  const [records, setRecords] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // state cho debounce
  const [searchParams, setSearchParams] = useState({ startDate: "", endDate: "" });

  // debounce: sau 500ms mới trigger fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchParams({ startDate, endDate });
    }, 500);

    return () => clearTimeout(handler);
  }, [startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParams.startDate) params.startDate = searchParams.startDate;
      if (searchParams.endDate) params.endDate = searchParams.endDate;

      const response = await axios.get("http://localhost:8081/api/record", { params });

      const recordsWithUrl = await Promise.all(
        response.data.map(async (record) => {
          const urlRes = await axios.get(
            `http://localhost:8081/api/record/url/${record.key}`
          );
          return { ...record, videoUrl: urlRes.data.url };
        })
      );
      setRecords(recordsWithUrl);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  // chạy fetch khi searchParams thay đổi (stream search)
  useEffect(() => {
    fetchRecords();
  }, [searchParams]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">📁 Admin Record</h1>

      {/* Bộ lọc ngày từ - đến */}
      <div className="mb-4 flex items-center gap-2">
        <label className="font-medium text-gray-700">Từ ngày:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border px-3 py-1 rounded"
        />

        <label className="font-medium text-gray-700">Đến ngày:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border px-3 py-1 rounded"
        />

        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading records...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {records.length > 0 ? (
            records.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer overflow-hidden"
                onClick={() => setSelectedVideo(record.videoUrl)}
              >
                <video
                  src={record.videoUrl}
                  className="w-full h-32 object-cover"
                  muted
                />
                <div className="p-2 text-center">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {record.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.lastModified).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p>No records found.</p>
          )}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-3xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-700 font-bold text-xl"
              onClick={() => setSelectedVideo(null)}
            >
              &times;
            </button>
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full h-auto rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRecord;
