import { useState, useCallback } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";
import axios from "axios";
import { useUser } from "../context/UserContext";

export const useAgentSubscriptions = () => {

  const { user, isAgent, token } = useUser();
  const [callAssignments, setCallAssignments] = useState([]);
  const [queueUpdates, setQueueUpdates] = useState(null);
  const [agentNotifications, setAgentNotifications] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);



  // Support request assignments (when user chooses this agent)
  useRoleChannelListener("request_assigned", (data) => {
    console.log("Agent received support request assignment:", data);
    setSupportRequests((prev) => [data, ...prev]);
  });

  useRoleChannelListener("NEW_CALL_ASSIGNMENT", (data) => {
    setCallAssignments((prev) => [data, ...prev]);
  });

  useRoleChannelListener("QUEUE_STATUS_UPDATE", (data) => {
    setQueueUpdates(data);
  });

  useRoleChannelListener("AGENT_NOTIFICATION", (data) => {
    setAgentNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  useRoleChannelListener("FORCE_LOGOUT", (data) => {

    console.log("FORCE_LOGOUT event received:", data);
    console.warn("🚨 FORCE_LOGOUT received!");

    handleLogout();

    if (window.confirm("You have been logged out by admin.\nNhấn OK để thoát.")) {
      logout(); // redirect về /login
    }

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


  return {
    callAssignments,
    queueUpdates,
    agentNotifications,
    supportRequests,
    
  };
};
