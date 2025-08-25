// src/pages/admin/AdminAgent.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useWebSocket } from "../../context/WebSocketContext";
import UserTable from "../../components/AdminUser/UserTable";
import AddUserModal from "../../components/AdminUser/AddUserModel";
import SearchBar from "../../components/AdminUser/SearchBar";

// import SearchBar from "../../components/AdminUser/SearchBar";
// import AddUserModal from "../../components/AdminUser/AddUserModal";
// import UserTable from "../../components/AdminUser/UserTable";


export default function AdminAgent() {
  const [agents, setAgents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ fullName: "", role: "AGENT" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { client, connect } = useWebSocket();
  const API_BASE_URL = "http://localhost:8081/api";

  // Fetch agents
  const fetchAgents = async (keyword = "") => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/agent?q=${keyword}&sort=id,asc`);
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents(searchKeyword);
  }, [searchKeyword]);

  // Connect WebSocket on mount
  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.token && userData.user) {
      connect(userData.token, userData.user);
    }
  }, [connect]);

  // Subscribe to status changes
  useEffect(() => {
    if (!client) return;
    const subscription = client.subscribe("/topic/users/status-changes", (message) => {
      try {
        const data = JSON.parse(message.body);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === data.userId ? { ...a, status: data.status } : a
          )
        );
      } catch (err) {
        console.error("Failed to parse agent status message", err);
      }
    });
    return () => subscription.unsubscribe();
  }, [client]);

  // CRUD Handlers
  const handleAddAgent = async () => {
    try {
      await axios.post(`${API_BASE_URL}/agent`, newAgent);
      setIsModalOpen(false);
      setNewAgent({ fullName: "", role: "AGENT" });
      fetchAgents(searchKeyword);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await axios.delete(`${API_BASE_URL}/agent/${agentId}`);
      fetchAgents(searchKeyword);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockAgent = async (agentId) => {
    try {
      await axios.put(`${API_BASE_URL}/agent/${agentId}/block`);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId ? { ...a, active: false, status: "OFFLINE" } : a
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnBlockAgent = async (agentId) => {
    try {
      await axios.put(`${API_BASE_URL}/agent/${agentId}/unblock`);
      fetchAgents(searchKeyword);
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
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">🎧 Agent Management</h1>
        <SearchBar
          value={searchKeyword}
          onChange={setSearchKeyword}
          onOpenModal={() => setIsModalOpen(true)}
        />
      </div>

      <UserTable
        users={agents}
        isLoading={isLoading}
        onBlock={handleBlockAgent}
        onUnblock={handleUnBlockAgent}
        onDelete={handleDeleteAgent}
        onRowClick={fetchAgentDetail}
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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-96 p-4 bg-white border rounded shadow-lg z-50">
            <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg">Agent Detail</h2>
            <button
                className="text-red-500 font-bold"
                onClick={() => setIsDetailOpen(false)}
            >
                ✖
            </button>
            </div>

            {isDetailLoading ? (
            <p>Loading...</p>
            ) : (
            <div className="space-y-1">
                <p><strong>ID:</strong> {selectedAgent.id}</p>
                <p><strong>Name:</strong> {selectedAgent.fullName}</p>
                <p><strong>Email:</strong> {selectedAgent.email}</p>
                <p><strong>Status:</strong> {selectedAgent.status}</p>
                <p><strong>Rating:</strong> {selectedAgent.rating}</p>
                <p><strong>Total Calls:</strong> {selectedAgent.totalCall}</p>
                <p><strong>Total Call Time:</strong> {selectedAgent.totalCallTime}</p>
            </div>
            )}
        </div>
        )}
    </div>
  );
}
