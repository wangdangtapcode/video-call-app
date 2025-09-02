import { useState, useCallback, useEffect } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";
import { useUser } from "../context/UserContext";
import axios from "axios";

export const useUserSubscriptions = () => {
  const { user, isAgent, userMetric, token, logout } = useUser();

  // User-specific states
  const [notifications, setNotifications] = useState([]);
  const [callRequests, setCallRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [supportUpdates, setSupportUpdates] = useState([]);

  // Agent presence states (moved from useAgentPresence)
  const [onlineAgents, setOnlineAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const API_BASE_URL = "http://localhost:8081/api";

  

  // Support-related notifications for users
  useRoleChannelListener("request_matched", (data) => {
    console.log("User received support request match:", data);
    setNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  useRoleChannelListener("request_timeout", (data) => {
    console.log("User received support request timeout:", data);
    setNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  useRoleChannelListener("agent_accepted", (data) => {
    const {request} = data;
    console.log("Agent accepted support request:", data);
    setNotifications((prev) => [data, ...prev.slice(0, 49)]);
    // setSupportUpdates((prev) => [data, ...prev]);

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
    setNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  useRoleChannelListener("MATCHING_PROGRESS", (data) => {
    console.log("User received matching progress:", data);
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
  useRoleChannelListener("USER_STATUS_CHANGE", (data) => {
    try {
      const { userId, status, timestamp, fullName, email } = data;
      console.log("User status change received:", {
        userId,
        fullName,
        status,
        timestamp,
      });

      // Update own status if it's for current user
      if (user && userId === user.id) {
        // setAgentStatus(status);
      }
      setTimeout(() => {
        console.log(
          "User status changed, reloading online agents list after a short delay..."
        );

        loadOnlineAgents();
      }, 500);
    } catch (error) {
      console.error("Error handling user status change:", error);
    }
  });

  useRoleChannelListener("FORCE_LOGOUT", (data) => {

    console.log("FORCE_LOGOUT event received:", data);
    console.warn("🚨 FORCE_LOGOUT received!");


    setIsBlockModalOpen(true);
    handleLogout();

  });

  const handleLogout = async () => {
    try {
      // Call backend logout API với JWT token
      if (user && token) {
        console.log('Calling logout API with JWT token...');
        await axios.post('http://localhost:8081/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error during logout API call:', error);
      // Continue with logout even if API call fails
    }
  }

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

  // Initialize agent status from userMetric
  // useEffect(() => {
  //   if (user && isAgent && userMetric) {
  //     const initialStatus = userMetric.status || "ONLINE";
  //     setAgentStatus(initialStatus);
  //   }
  // }, [user, isAgent, userMetric]);

  

  return {
    // User subscription data
    notifications,
    callRequests,
    announcements,
    supportUpdates,

    // Agent presence data (for backwards compatibility)
    // agentStatus,
    onlineAgents,
    isLoading,
    isLoadingAgents,

    // Agent presence functions
    loadOnlineAgents,

    users,
    agents,

    setUsers, 
    setAgents,

    isBlockModalOpen,
    handleLogout
  };
};
