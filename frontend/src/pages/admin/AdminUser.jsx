// src/pages/admin/AdminUser.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useWebSocket } from "../../context/WebSocketContext";
import SearchBar from "../../components/AdminUser/SearchBar";
import AddUserModal from "../../components/AdminUser/AddUserModel";
import UserTable from "../../components/AdminUser/UserTable";
import { useUserSubscriptions } from "../../hooks/useUserSubscriptions";
// import SearchBar from "../../components/AdminUser/SearchBar";
// import UserTable from "../../components/AdminUser/UserTable";
// import AddUserModal from "../../components/AdminUser/AddUserModal";

export default function AdminUser() {
  const {users, setUsers} = useUserSubscriptions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", role: "USER" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { client, connect } = useWebSocket();
  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch users
  const fetchUsers = async (keyword = "") => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/user?q=${keyword}&sort=id,asc`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchKeyword);
  }, [searchKeyword]);

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
      fetchUsers(searchKeyword);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API_BASE_URL}/user/${userId}`);
      fetchUsers(searchKeyword);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${userId}/block`);
      // fetchUsers(searchKeyword);
      setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, active: false, status: "OFFLINE"} : u
          )
        );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnBlockUser = async (userId) => {
    try {
      await axios.put(`${API_BASE_URL}/user/${userId}/unblock`);
      fetchUsers(searchKeyword);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">👥 User Management</h1>
        <SearchBar
          value={searchKeyword}
          onChange={setSearchKeyword}
          onOpenModal={() => setIsModalOpen(true)}
        />
      </div>

      <UserTable
        users={users}
        isLoading={isLoading}
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
