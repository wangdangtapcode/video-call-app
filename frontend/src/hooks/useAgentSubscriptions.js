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
  useRoleChannelListener("permission_cancelled", (data) => {
    console.log("Permission cancelled notification:", data);
    setAgentNotifications((prev) => [data, ...prev.slice(0, 49)]);
  });

  return {
    callAssignments,
    queueUpdates,
    agentNotifications,
    supportRequests,
    
  };
};
