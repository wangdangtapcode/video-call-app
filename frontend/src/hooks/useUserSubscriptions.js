import { useState, useCallback, useEffect } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";
import { useUser } from "../context/UserContext";
import axios from "axios";

export const useUserSubscriptions = () => {
  const { user, isAgent, userMetric, token } = useUser();

  // User-specific states
  const [notifications, setNotifications] = useState([]);
  const [callRequests, setCallRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [supportUpdates, setSupportUpdates] = useState([]);

  // Agent presence states (moved from useAgentPresence)
  const [agentStatus, setAgentStatus] = useState("OFFLINE");
  const [onlineAgents, setOnlineAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const API_BASE_URL = "http://localhost:8081/api";

  // Support-related notifications for users
  useRoleChannelListener("request_matched", (data) => {
    console.log("User received support request match:", data);
    setSupportUpdates((prev) => [data, ...prev.slice(0, 9)]);
  });

  useRoleChannelListener("request_timeout", (data) => {
    console.log("User received support request timeout:", data);
    setSupportUpdates((prev) => [data, ...prev.slice(0, 9)]);
  });

  useRoleChannelListener("agent_accepted", (data) => {
    console.log("Agent accepted support request:", data);
    setSupportUpdates((prev) => [data, ...prev]);

    // Auto redirect to call page after 2 seconds
    // setTimeout(() => {
    //   const requestId = data.request?.id || data.requestId;
    //   if (requestId) {
    //     window.location.href = `/call/${requestId}`;
    //   }
    // }, 2000);
  });

  useRoleChannelListener("agent_rejected", (data) => {
    console.log("Agent rejected support request:", data);
    setSupportUpdates((prev) => [data, ...prev.slice(0, 9)]);
  });

  useRoleChannelListener("NEW_NOTIFICATION", (data) => {
    setNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  useRoleChannelListener("CALL_REQUEST_UPDATE", (data) => {
    setCallRequests((prev) => {
      const filtered = prev.filter((req) => req.id !== data.id);
      return [data, ...filtered];
    });
  });

  useRoleChannelListener("SYSTEM_ANNOUNCEMENT", (data) => {
    setAnnouncements((prev) => [data, ...prev.slice(0, 9)]);
  });

  // Agent status changes (moved from useAgentPresence)
  useRoleChannelListener("AGENT_STATUS_CHANGE", (data) => {
    try {
      const { userId, status, timestamp, fullName, email } = data;
      console.log("Agent status change received:", {
        userId,
        status,
        timestamp,
      });

      // Update own status if it's for current user
      if (user && userId === user.id) {
        setAgentStatus(status);
      }
      setTimeout(() => {
        console.log(
          "Agent status changed, reloading online agents list after a short delay..."
        );
        loadOnlineAgents();
      }, 500);
    } catch (error) {
      console.error("Error handling agent status change:", error);
    }
  });

  // Agent presence functions (moved from useAgentPresence)
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

  // Initialize agent status from userMetric
  useEffect(() => {
    if (user && isAgent && userMetric) {
      const initialStatus = userMetric.status || "ONLINE";
      setAgentStatus(initialStatus);
    }
  }, [user, isAgent, userMetric]);

  return {
    // User subscription data
    notifications,
    callRequests,
    announcements,
    supportUpdates,

    // Agent presence data (for backwards compatibility)
    agentStatus,
    onlineAgents,
    isLoading,
    isLoadingAgents,

    // Agent presence functions
    updateAgentStatus,
    loadOnlineAgents,
  };
};
