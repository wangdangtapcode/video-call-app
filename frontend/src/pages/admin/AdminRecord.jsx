import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const AdminRecord = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [layout, setLayout] = useState(() => localStorage.getItem("adminRecordLayout") || "grid");

  const folderKey = location.pathname.replace("/admin/record/", "") || "";

  const handleSetLayout = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem("adminRecordLayout", newLayout);
  };

  const truncateName = (name, maxLength) =>
    name.length <= maxLength ? name : name.slice(0, maxLength - 3) + "...";

  const formatSize = (size) => {
    if (!size || size === 0) return "-";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    return (size / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        const res = await axios.get(
          folderKey
            ? `http://localhost:8081/api/record/tree?folderKey=${folderKey}`
            : `http://localhost:8081/api/record/tree`
        );
        setCurrentFolder(res.data);
      } catch (e) {
        console.error("Error fetching folder:", e);
      }
    };
    fetchFolder();
  }, [folderKey]);

  const handleFileClick = async (node) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/record/url?key=${node.key}`);
      setSelectedVideo(res.data.url);
    } catch (e) {
      console.error("Error loading video:", e);
    }
  };

  const handleFolderClick = (node) => navigate(`/admin/record/${node.key}`);

  const handleDelete = async (node) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${node.name}"?`)) return;
    try {
      await axios.delete(`http://localhost:8081/api/record/delete?key=${node.key}`);
      const res = await axios.get(
        folderKey
          ? `http://localhost:8081/api/record/tree?folderKey=${folderKey}`
          : `http://localhost:8081/api/record/tree`
      );
      setCurrentFolder(res.data);
    } catch (e) {
      console.error("Error deleting:", e);
    }
  };

  return (
  <div className="p-6">
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl md:text-3xl font-bold">📁 Admin Record</h1>
      <div className="space-x-2">
        <button
          className={`px-3 py-1 rounded ${layout === "grid" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => handleSetLayout("grid")}
        >
          Grid
        </button>
        <button
          className={`px-3 py-1 rounded ${layout === "list" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => handleSetLayout("list")}
        >
          List
        </button>
      </div>
    </div>

    {/* Folder/File list */}
    {currentFolder?.children?.length > 0 ? (
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            : "flex flex-col divide-y"
        }
      >
        {currentFolder.children.map((child, idx) => (
          <div
            key={idx}
            className={`p-3 flex items-center justify-between bg-white rounded-lg shadow-sm hover:shadow-md ${
              layout === "list" ? "flex-row hover:bg-gray-50" : "flex-col items-center"
            }`}
          >
            {/* Icon + Name + Info */}
            <div
              className={`cursor-pointer flex ${
                layout === "list" ? "flex-row items-center flex-1 space-x-3" : "flex-col items-center mb-2"
              }`}
              onClick={() => (child.folder ? handleFolderClick(child) : handleFileClick(child))}
            >
              <div className="text-3xl">{child.folder ? "📁" : "📄"}</div>

              <div className={layout === "list" ? "flex-1 flex justify-between items-center" : "flex flex-col items-center"}>
                <p
                  className={`text-sm font-medium truncate ${layout === "grid" ? "mb-1" : ""}`}
                  title={child.name} // <- tooltip hiển thị tên đầy đủ
                >
                  {truncateName(child.name, layout === "grid" ? 15 : 100)}
                </p>
                <p className={`text-xs text-gray-500 ${layout === "list" ? "ml-2" : "text-center"}`}>
                  {formatSize(child.size)} | {formatDate(child.lastModified)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex space-x-2 ${layout === "grid" ? "mt-2" : ""}`}>
              <button
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                onClick={() => handleDelete(child)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">Thư mục trống</p>
    )}

    {/* Video modal */}
    {selectedVideo && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 max-w-3xl w-full relative">
          <button
            className="absolute top-2 right-2 text-gray-700 font-bold text-xl"
            onClick={() => setSelectedVideo(null)}
          >
            &times;
          </button>
          <video src={selectedVideo} controls autoPlay className="w-full h-auto rounded" />
        </div>
      </div>
    )}
  </div>
);
}

export default AdminRecord;
