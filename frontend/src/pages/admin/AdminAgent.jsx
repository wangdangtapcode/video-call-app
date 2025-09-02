// src/pages/admin/AdminAgent.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import UserTable from "../../components/AdminUser/UserTable";
import AddUserModal from "../../components/AdminUser/AddUserModel";
import SearchBar from "../../components/AdminUser/SearchBar";
import StarRating from "../../components/AdminDashboard/StarRating";
import { useAdminSubscriptions } from "../../hooks/useAdminSubscriptions";
import * as XLSX from "xlsx";


export default function AdminAgent() {
  const { agents, setAgents } = useAdminSubscriptions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ fullName: "", role: "AGENT" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Top stats
  const [topRating, setTopRating] = useState(null);
  const [topCalls, setTopCalls] = useState(null);
  const [topTime, setTopTime] = useState(null);

  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch agents
  const fetchAgents = async (keyword = "", pageNum = page) => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/agent?q=${keyword}&page=${pageNum}&size=${size}&sort=id,asc`
      );

      setAgents(res.data.content);
      setTotalPages(res.data.totalPages);
      setPage(res.data.number);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch top statistics
  const fetchTopStats = async () => {
    try {
      const [ratingRes, callsRes, timeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/agent/top-rating`),
        axios.get(`${API_BASE_URL}/agent/top-total-calls`),
        axios.get(`${API_BASE_URL}/agent/top-total-call-times`),
      ]);
      setTopRating(ratingRes.data);
      setTopCalls(callsRes.data);
      setTopTime(timeRes.data);
    } catch (err) {
      console.error("Failed to fetch top stats", err);
    }
  };

  // Khi searchKeyword thay đổi → reset page 0
  useEffect(() => {
    fetchAgents(searchKeyword, 0);
  }, [searchKeyword]);

  // Load top stats khi vào trang
  useEffect(() => {
    fetchTopStats();
  }, []);

  // CRUD Handlers
  const handleAddAgent = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user`, newAgent);
      setIsModalOpen(false);
      setNewAgent({ fullName: "", role: "AGENT" });
      fetchAgents(searchKeyword, 0);
      fetchTopStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await axios.delete(`${API_BASE_URL}/agent/${agentId}`);
      fetchAgents(searchKeyword, page);
      fetchTopStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockAgent = async (agentId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${agentId}/block`);
      setAgents((prev) =>
        prev.map((u) =>
          u.id === agentId ? { ...u, active: false, status: "OFFLINE" } : u
        )
      );
      fetchTopStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnBlockAgent = async (agentId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${agentId}/unblock`);
      fetchAgents(searchKeyword, page);
      fetchTopStats();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgentDetail = async (agentId) => {
    try {
      setIsDetailLoading(true);
      const res = await axios.get(`${API_BASE_URL}/agent/${agentId}`);
      setSelectedAgent(res.data);
      setIsDetailOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const exportAgentsExcel = () => {
    if (!agents || !agents.length) return;

    const data = agents.map(a => ({
      "Agent ID": a.id,
      "Agent Name": a.fullName,
      Email: a.email,
      Status: a.status,
      Rating: a.rating,
      "Total Calls": a.totalCall,
      "Total Call Time": formatTime(a.totalCallTime)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agents");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "agents.xlsx");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          🎧 Agent Management
        </h1>
        <SearchBar
          value={searchKeyword}
          onChange={setSearchKeyword}
          onOpenModal={() => setIsModalOpen(true)}
        />

        <button
          onClick={exportAgentsExcel}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export Excel
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topRating && (
          <div
            onClick={() => fetchAgentDetail(topRating.id)}
            className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg rounded-2xl border border-yellow-300 cursor-pointer hover:scale-105 transition-transform"
          >
            <h3 className="font-semibold text-yellow-700 flex items-center gap-2">
              ⭐ Top Rating
            </h3>
            <p className="text-xl font-bold text-gray-800 mt-2">{topRating.fullName}</p>
            <div className="mt-1">
              <StarRating rating={topRating.rating} />
            </div>
          </div>
        )}
        {topCalls && (
          <div
            onClick={() => fetchAgentDetail(topCalls.id)}
            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg rounded-2xl border border-blue-300 cursor-pointer hover:scale-105 transition-transform"
          >
            <h3 className="font-semibold text-blue-700 flex items-center gap-2">
              📞 Most Calls
            </h3>
            <p className="text-xl font-bold text-gray-800 mt-2">{topCalls.fullName}</p>
            <p className="text-lg font-semibold text-blue-600 mt-1">
              {topCalls.totalCall} calls
            </p>
          </div>
        )}
        {topTime && (
          <div
            onClick={() => fetchAgentDetail(topTime.id)}
            className="p-6 bg-gradient-to-br from-green-50 to-green-100 shadow-lg rounded-2xl border border-green-300 cursor-pointer hover:scale-105 transition-transform"
          >
            <h3 className="font-semibold text-green-700 flex items-center gap-2">
              ⏱️ Longest Call Time
            </h3>
            <p className="text-xl font-bold text-gray-800 mt-2">{topTime.fullName}</p>
            <p className="text-lg font-semibold text-green-600 mt-1">
              {formatTime(topTime.totalCallTime)}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <UserTable
        users={agents}
        isLoading={isLoading}
        onBlock={handleBlockAgent}
        onUnblock={handleUnBlockAgent}
        onDelete={handleDeleteAgent}
        onRowClick={fetchAgentDetail}
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) => fetchAgents(searchKeyword, newPage)}
      />

      {isModalOpen && (
        <AddUserModal
          newUser={newAgent}
          setNewUser={setNewAgent}
          onSave={handleAddAgent}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailOpen && selectedAgent && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-96 p-6 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="font-semibold text-xl text-gray-800">Agent Detail</h2>
            <button
              className="text-gray-400 hover:text-red-500 font-bold text-lg"
              onClick={() => setIsDetailOpen(false)}
            >
              ✖
            </button>
          </div>

          {isDetailLoading ? (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium">ID:</span>
                <span>{selectedAgent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{selectedAgent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{selectedAgent.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <span
                  className={`font-semibold ${
                    selectedAgent.status === "ONLINE"
                      ? "text-green-600"
                      : selectedAgent.status === "OFFLINE"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {selectedAgent.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Rating:</span>
                <StarRating rating={selectedAgent.rating} />
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Calls:</span>
                <span>{selectedAgent.totalCalls}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Call Time:</span>
                <span>{formatTime(selectedAgent.totalCallTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
