import { useState, useCallback } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";
import axios from "axios";
import { useUser } from "../context/UserContext";

export const useAgentSubscriptions = () => {

  const { user, isAgent, token, updateStatus } = useUser();
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


  const updateAgentStatus = useCallback(
    async (newStatus) => {
      if (!user || !isAgent || !token) {
        console.warn("Cannot update status: user is not an agent or no token");
        return false;
      }

      try {
        console.log("Updating agent status to:", newStatus);

        await axios.put(`http://localhost:8081/api/user-metrics/${user.id}/status`, null, {
          params: { status: newStatus },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        updateStatus(newStatus);

        return true;
      } catch (error) {
        console.error("Error updating agent status:", error);
        return false;
      }
    },
    [user, isAgent, token, updateStatus]
  );


  return {
    callAssignments,
    queueUpdates,
    agentNotifications,
    supportRequests,
    updateAgentStatus,
  };
};
