// src/pages/admin/AdminUser.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useWebSocket } from "../../context/WebSocketContext";
import SearchBar from "../../components/AdminUser/SearchBar";
import AddUserModal from "../../components/AdminUser/AddUserModel";
import UserTable from "../../components/AdminUser/UserTable";
import { useAdminSubscriptions } from "../../hooks/useAdminSubscriptions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function AdminUser() {
  const { users, setUsers } = useAdminSubscriptions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", role: "USER" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(5);

  const { connect } = useWebSocket();
  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch users with pagination
  const fetchUsers = async (keyword = "", pageNumber = 0) => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/user?q=${keyword}&page=${pageNumber}&size=${pageSize}&sort=id,asc`
      );

      setUsers(res.data.content);
      setTotalPages(res.data.totalPages);
      setPage(res.data.number);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchKeyword, page);
  }, [searchKeyword, page]);

  // Connect WebSocket on mount
  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.token && userData.user) {
      connect(userData.token, userData.user);
    }
  }, [connect]);

  // CRUD Handlers
  const handleAddUser = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user`, newUser);
      setIsModalOpen(false);
      setNewUser({ fullName: "", role: "USER" });
      fetchUsers(searchKeyword, page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API_BASE_URL}/user/${userId}`);
      fetchUsers(searchKeyword, page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${userId}/block`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, active: false, status: "OFFLINE" } : u
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnBlockUser = async (userId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${userId}/unblock`);
      fetchUsers(searchKeyword, page);
    } catch (err) {
      console.error(err);
    }
  };

  // Export Excel
  const exportUsersExcel = () => {
    if (!users || !users.length) return;

    const data = users.map(u => ({
      "User ID": u.id,
      "User Name": u.fullName,
      Email: u.email || "",
      Status: u.status || "",
      Role: u.role || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "users.xlsx");
  };

  // Helper format time
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          👥 User Management
        </h1>
        <div className="flex gap-2">
          <SearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            onOpenModal={() => setIsModalOpen(true)}
          />
          <button
            onClick={exportUsersExcel}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export Excel
          </button>
        </div>
      </div>

      <UserTable
        users={users}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
        onBlock={handleBlockUser}
        onUnblock={handleUnBlockUser}
        onDelete={handleDeleteUser}
      />

      {isModalOpen && (
        <AddUserModal
          newUser={newUser}
          setNewUser={setNewUser}
          onSave={handleAddUser}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
