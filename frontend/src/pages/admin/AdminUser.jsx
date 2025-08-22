// src/pages/admin/AdminUser.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useWebSocket } from "../../context/WebSocketContext";

export default function AdminUser() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", role: "USER" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { client, connect } = useWebSocket(); // 👈 lấy client STOMP từ context

  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch users from server
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

  // Subscribe to admin channel
  useEffect(() => {
    if (!client) return;

    const subscription = client.subscribe("/topic/users/status-changes", (message) => {
      try {
        const data = JSON.parse(message.body);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId ? { ...u, status: data.status } : u
          )
        );
      } catch (err) {
        console.error("Failed to parse user status message", err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  // Add user
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

  // Delete user
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
      await
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      {/* Header & Search */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">👥 User Management</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-gray-600">Loading users...</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 uppercase text-sm">
              <tr>
                <th className="p-3 border-b">ID</th>
                <th className="p-3 border-b">Full Name</th>
                <th className="p-3 border-b">Email</th>
                <th className="p-3 border-b">Role</th>
                <th className="p-3 border-b text-center">Status</th>
                <th className="p-3 border-b text-center">Active</th>
                <th className="p-3 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {users.map((u, idx) => (
                <tr key={u.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-3 border-b">{u.id}</td>
                  <td className="p-3 border-b font-medium">{u.fullName}</td>
                  <td className="p-3 border-b">{u.email}</td>
                  <td className="p-3 border-b">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${
                          u.role === "ADMIN"
                            ? "bg-red-100 text-red-600"
                            : u.role === "AGENT"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                        }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 border-b text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${
                          u.status === "ONLINE"
                            ? "bg-green-100 text-green-600"
                            : u.status === "OFFLINE"
                            ? "bg-gray-100 text-gray-600"
                            : u.status === "BUSY"
                            ? "bg-yellow-100 text-yellow-600"
                            : u.status === "CALLING"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-100 text-red-600"
                        }`}
                    >
                      {u.status || "OFFLINE"}
                    </span>
                  </td>
                  <td className="p-3 border-b text-center">
                    {u.isActive ? (
                      <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-300 text-gray-700 rounded-full text-xs">No</span>
                    )}
                  </td>
                  <td className="p-3 border-b flex gap-2 justify-center">
                    <button
                      onClick={() => handleBlockUser(u.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                    >
                      Block
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Add User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">➕ Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-600">Full Name</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, fullName: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-600">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AGENT">Agent</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
