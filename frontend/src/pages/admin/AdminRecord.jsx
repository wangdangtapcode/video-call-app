import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function AdminRecord() {
  const [records, setRecords] = useState([]);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);

  const [agentKeyword, setAgentKeyword] = useState("");
  const [userKeyword, setUserKeyword] = useState("");

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    agentId: "",
    userId: "",
    startDate: "",
    endDate: ""
  });

  const API_BASE_URL = "http://localhost:8081/api";

  const agentTimeoutRef = useRef(null);
  const userTimeoutRef = useRef(null);

  const fetchRecords = async () => {
    try {
      const params = { page, size, ...filters };
      const res = await axios.get(`${API_BASE_URL}/record`, { params });
      setRecords(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  const fetchAgents = async (keyword = "") => {
    try {
      const res = await axios.get(`${API_BASE_URL}/agent?q=${keyword}&page=0&size=50&sort=id,asc`);
      setAgents(res.data.content || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchUsers = async (keyword = "") => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user?q=${keyword}&page=0&size=50&sort=id,asc`);
      setUsers(res.data.content || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
    agentTimeoutRef.current = setTimeout(() => fetchAgents(agentKeyword), 500);
  }, [agentKeyword]);

  useEffect(() => {
    if (userTimeoutRef.current) clearTimeout(userTimeoutRef.current);
    userTimeoutRef.current = setTimeout(() => fetchUsers(userKeyword), 500);
  }, [userKeyword]);

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString("en-GB", { hour12: false });
  };

  // --- Export Excel Function ---
  const exportExcel = () => {
  if (!records.length) return;

  const data = records.map(r => ({
    "Agent ID": r.agentId,
    "Agent Name": r.agentFullName,
    "User ID": r.userId,
    "User Name": r.userFullName,
    "Session": r.sessionId,
    "Duration (s)": r.duration,
    "File URL": r.s3Url || "",
    "Started At": formatDateTime(r.startedAt),
    "Stopped At": formatDateTime(r.stoppedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "records.xlsx");
};

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Record Management</h2>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div>
          <input
            type="text"
            placeholder="Search Agent..."
            value={agentKeyword}
            onChange={(e) => setAgentKeyword(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
          />
          <select
            name="agentId"
            value={filters.agentId}
            onChange={handleFilterChange}
            className="w-full border rounded px-3 py-2 mt-2 focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.fullName}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="text"
            placeholder="Search User..."
            value={userKeyword}
            onChange={(e) => setUserKeyword(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-green-400"
          />
          <select
            name="userId"
            value={filters.userId}
            onChange={handleFilterChange}
            className="w-full border rounded px-3 py-2 mt-2 focus:ring-2 focus:ring-green-400"
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.fullName}</option>
            ))}
          </select>
        </div>

        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="border rounded px-3 py-2 focus:ring-2 focus:ring-purple-400"
        />
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          className="border rounded px-3 py-2 focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Export Button */}
      <div className="mb-4">
        <button
          onClick={exportExcel}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export Excel
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {["ID", "Session", "Agent", "User", "Duration (s)", "File", "Started At", "Stopped At"].map(header => (
                <th key={header} className="px-4 py-2 border-b text-left text-gray-700">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">{record.id}</td>
                <td className="px-4 py-2 border-b">{record.sessionId}</td>
                <td className="px-4 py-2 border-b">{record.agentFullName} (id: {record.agentId})</td>
                <td className="px-4 py-2 border-b">{record.userFullName} (id: {record.userId})</td>
                <td className="px-4 py-2 border-b">{record.duration}</td>
                <td className="px-4 py-2 border-b">
                  {record.s3Url && (
                    <a href={record.s3Url} target="_blank" className="text-blue-500 underline hover:text-blue-700">View</a>
                  )}
                </td>
                <td className="px-4 py-2 border-b">{formatDateTime(record.startedAt)}</td>
                <td className="px-4 py-2 border-b">{formatDateTime(record.stoppedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-6">
        <button
          disabled={page === 0}
          onClick={() => setPage(prev => prev - 1)}
          className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-4 py-2 border rounded bg-gray-50">{page + 1} / {totalPages}</span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(prev => prev + 1)}
          className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
