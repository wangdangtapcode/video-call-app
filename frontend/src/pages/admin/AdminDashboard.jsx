import { useEffect, useState } from "react";
import { useWebSocket } from "../../context/WebSocketContext";
import axios from "axios";

export const AdminDashboard = () => {
  const { client, connect } = useWebSocket();
  const [userOnlineCount, setUserOnlineCount] = useState(0);
  const [agentOnlineCount, setAgentOnlineCount] = useState(0);
  const [callCount, setCallCount] = useState(0);

  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch initial data
  const fetchTotals = async () => {
    try {
      const [userRes, agentRes, callRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/total`),
        axios.get(`${API_BASE_URL}/agent/total`),
        axios.get(`${API_BASE_URL}/agent/call/total`),
      ]);
      setUserOnlineCount(userRes.data.total);
      setAgentOnlineCount(agentRes.data.total);
      setCallCount(callRes.data.total); // backend trả về totalCalls
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTotals();
    // Connect WebSocket
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.token && userData.user) {
      connect(userData.token, userData.user);
    }
  }, [connect]);

  // Listen for realtime updates
  useEffect(() => {
    if (!client) return;

    const subscription = client.subscribe("/topic/users/status-changes", () => {
      fetchTotals();
    });

    return () => subscription.unsubscribe();
  }, [client]);

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">📊 Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Users Online */}
        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">Users Online</h3>
          <span className="text-3xl font-bold text-green-600">{userOnlineCount}</span>
        </div>

        {/* Agents Online */}
        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">Agents Online</h3>
          <span className="text-3xl font-bold text-blue-600">{agentOnlineCount}</span>
        </div>

        {/* Calls Running */}
        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">Calls Running</h3>
          <span className="text-3xl font-bold text-red-600">{callCount}</span>
        </div>
      </div>
    </div>
  );
};
