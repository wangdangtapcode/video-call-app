import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useUser } from "../context/UserContext";
import axios from "axios";

export const useAgentPresence = () => {
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const { user, isAgent, userMetric, token } = useUser();
  const [agentStatus, setAgentStatus] = useState("OFFLINE");
  const [onlineAgents, setOnlineAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const API_BASE_URL = "http://localhost:8081/api";

  const loadOnlineAgents = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoadingAgents(true);
      const response = await axios.get(
        `${API_BASE_URL}/support/agents/online`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setOnlineAgents(response.data.agents || []);
      console.log("online agents", response.data);
    } catch (error) {
      console.error("Error loading online agents:", error);
      setOnlineAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [token]);

  const handleAgentStatusChange = useCallback(
    (message) => {
      try {
        const { userId, status, timestamp, fullName, email } = message;
        console.log("Agent status change received:", {
          userId,
          status,
          timestamp,
        });

        if (user && userId === user.id) {
          setAgentStatus(status);
        }

        console.log("Agent status changed, reloading online agents list...");
        loadOnlineAgents();
      } catch (error) {
        console.error("Error handling agent status change:", error);
      }
    },
    [user, loadOnlineAgents]
  );

  /**
   * Update agent status manually (for status dropdown)
   */
  const updateAgentStatus = useCallback(
    async (newStatus) => {
      if (!user || !isAgent || !token) {
        console.warn("Cannot update status: user is not an agent or no token");
        return false;
      }

      try {
        setIsLoading(true);
        console.log("Updating agent status to:", newStatus);

        await axios.put(`${API_BASE_URL}/agents/${user.id}/status`, null, {
          params: { status: newStatus },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return true;
      } catch (error) {
        console.error("Error updating agent status:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, isAgent, token]
  );

  useEffect(() => {
    if (user && isAgent && userMetric) {
      const initialStatus = userMetric.status || "ONLINE";
      setAgentStatus(initialStatus);
    }
  }, [user, isAgent, userMetric]);

  useEffect(() => {
    if (isConnected && token) {
      console.log(
        "WebSocket connected, subscribing to agent status changes..."
      );
      subscribe("/topic/agents/status-changes", handleAgentStatusChange);
    }

    return () => {
      unsubscribe("/topic/agents/status-changes");
    };
  }, [
    isConnected,
    token,
    subscribe,
    unsubscribe,
    handleAgentStatusChange,
    loadOnlineAgents,
  ]);

  return {
    agentStatus,
    onlineAgents,
    isLoading,
    isLoadingAgents,
    isConnected,

    updateAgentStatus,
    loadOnlineAgents,
  };
};
