import { useEffect, useState } from "react";
import { useWebSocket } from "../../context/WebSocketContext";
import axios from "axios";

export const AdminDashboard = () => {
  const { client, connect } = useWebSocket();
  const [users, setUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch initial users
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user?sort=id,asc`);
      setUsers(res.data);
      // Tính số user đang online
      setOnlineCount(res.data.filter(u => u.status === "ONLINE").length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Connect WebSocket
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.token && userData.user) {
      connect(userData.token, userData.user);
    }
  }, [connect]);

  // Listen for realtime status changes
  useEffect(() => {
    if (!client) return;

    const subscription = client.subscribe("/topic/users/status-changes", (message) => {
      try {
        const data = JSON.parse(message.body); // { userId, status, type, timestamp }

        setUsers(prev => {
          const updated = prev.map(u =>
            u.id === data.userId ? { ...u, status: data.status } : u
          );
          // Cập nhật số online
          setOnlineCount(updated.filter(u => u.status === "ONLINE").length);
          return updated;
        });
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    });

    return () => subscription.unsubscribe();
  }, [client]);

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">📊 Admin Dashboard</h1>
        </div>
        <div className="mt-4">
            <div className="bg-white shadow-md rounded-lg p-6 w-64 flex flex-col items-center justify-center">
                <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">Users Online</h3>
                <span className="text-3xl font-bold text-green-600">{onlineCount}</span>
            </div>
        </div>
    </div>
  );
};
