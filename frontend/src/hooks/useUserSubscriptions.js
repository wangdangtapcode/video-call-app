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

  const [userOnlineCount, setUserOnlineCount] = useState(0);
  const [agentOnlineCount, setAgentOnlineCount] = useState(0);
  const [callCount, setCallCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalCallTime, setTotalCallTime] = useState(0);
  const [agentData, setAgentData] = useState([]);

  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);

  const [logs, setLogs] = useState([]);

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
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: status} : u
          )
        );

        setAgents((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: status} : u
          )
        );
        setLogs((prev) => [...prev, {userId, fullName, status, timestamp}]);

        fetchTotals();
        loadOnlineAgents();
      }, 500);
    } catch (error) {
      console.error("Error handling user status change:", error);
    }
  });

  useRoleChannelListener("FORCE_LOGOUT", (data) => {

    console.log("FORCE_LOGOUT event received:", data);
    console.warn("🚨 FORCE_LOGOUT received!");

    alert("You have been logged out by admin.");
    // Thoát session
    logout();
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


  const fetchTotals = useCallback(async () => {
    try {
      const [
        userRes,
        agentRes,
        callRes,
        metricRes,
        agentMetricsRes,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/total`),
        axios.get(`${API_BASE_URL}/agent/total`),
        axios.get(`${API_BASE_URL}/agent/call/total`),
        axios.get(`${API_BASE_URL}/agent/summary`),
        axios.get(`${API_BASE_URL}/agent/all`),
      ]);

      setUserOnlineCount(userRes.data.total);
      setAgentOnlineCount(agentRes.data.total);
      setCallCount(callRes.data.total);

      setAvgRating(metricRes.data.avgRating || 0);
      setTotalCalls(metricRes.data.totalCalls || 0);
      setTotalCallTime(metricRes.data.totalCallTime || 0);

      setAgentData(agentMetricsRes.data);
    } catch (err) {
      console.error("Error fetching totals:", err);
    }
  }, []);

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

    userOnlineCount,
    agentOnlineCount,
    callCount,
    avgRating,
    totalCalls,
    totalCallTime,
    agentData,

    fetchTotals,

    users,
    agents,
    logs,

    setUsers, 
    setAgents,
  };
};
