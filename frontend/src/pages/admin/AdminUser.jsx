// src/pages/admin/AdminUser.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminUser() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", role: "USER" });

  // Lấy danh sách user từ server
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8081/api/user");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async () => {
    try {
      await axios.post("http://localhost:8081/api/user", newUser);
      setIsModalOpen(false);
      setNewUser({ fullName: "", role: "USER" });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
        await axios.delete(`http://localhost:8081/api/user/${userId}`);
        fetchUsers();
    } catch (err) {
        console.error(err);
    }
} 
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">User Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Add User
        </button>
      </div>

      <table className="w-full border">
        <thead>
            <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Full Name</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Actions</th>
            </tr>
        </thead>
        <tbody>
            {users.map((u) => (
            <tr key={u.id}>
                <td className="p-2 border">{u.id}</td>
                <td className="p-2 border">{u.fullName}</td>
                <td className="p-2 border">{u.email}</td>
                <td className="p-2 border">{u.role}</td>
                <td className="p-2 border flex gap-2 justify-center">
                <button
                    onClick={() => handleEdit(u)}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Edit
                </button>
                <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Delete
                </button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>


      {/* Modal Add User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Add New User</h2>
            <div className="mb-3">
              <label className="block mb-1 text-sm">Full Name</label>
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) =>
                  setNewUser({ ...newUser, fullName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm">Role</label>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="AGENT">AGENT</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
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
