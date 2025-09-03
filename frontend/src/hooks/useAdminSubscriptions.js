import { useState, useCallback, use } from "react";
import { useRoleChannelListener } from "./useRoleChannelListener";
import axios from "axios";

export const useAdminSubscriptions = () => {
    const [logs, setLogs] = useState([]);
    const [userOnlineCount, setUserOnlineCount] = useState(0);
    const [agentOnlineCount, setAgentOnlineCount] = useState(0);
    const [callCount, setCallCount] = useState(0);  
    const [avgRating, setAvgRating] = useState(0);
    const [totalCalls, setTotalCalls] = useState(0);
    const [totalCallTime, setTotalCallTime] = useState(0);
    const [agentData, setAgentData] = useState([]);

    const [agents, setAgents] = useState([]);
    const [users, setUsers] = useState([]);

    const API_BASE_URL = "http://localhost:8081/api";

    const formatTime = (millis) => {
        const date = new Date(millis);
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const addLog = (newLog) => {
        setLogs((prev) => [newLog, ...prev].slice(0, 30));
    };

    useRoleChannelListener("USER_STATUS_CHANGE", (data) => {
        try {
            const { userId, status, timestamp, fullName } = data;

            console.log("User status change received:", {
                userId,
                fullName,
                status,
                timestamp,
            });

            setTimeout(() => {
                fetchTotals();
                        addLog(`${fullName} (${userId}) chuyển sang ${status} lúc ${formatTime(timestamp)}`);
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
            }, 500);
            

        } catch (error) {
            console.error("Error handling user status change:", error);

            addLog("Lỗi khi xử lý user status change");
        }
    });

    useRoleChannelListener("request_assigned", (data) => {
        console.log("Agent received support request assignment:", data);

        const {request, timestamp} = data;
        
        const {user, agent, type} = request;
        
        addLog(`${user.fullName} (${user.id}) gửi yêu cầu tới ${agent.fullName} (${agent.id}) lúc ${formatTime(timestamp)} - phương thức: ${type}`);
    });

    useRoleChannelListener("NEW_CALL_ASSIGNMENT", (data) => {
        addLog("Log NEW_CALL_ASSIGNMENT mới");
    });

    useRoleChannelListener("QUEUE_STATUS_UPDATE", (data) => {
        addLog("Log QUEUE_STATUS_UPDATE mới" );
    });

    useRoleChannelListener("AGENT_NOTIFICATION", (data) => {
        addLog("Log AGENT_NOTIFICATION mới" );
    });

    useRoleChannelListener("request_matched", (data) => {
        console.log("User received support request match:", data);

        const {request, timestamp} = data;
        const {user, agent, type} = request;
        addLog(`${user.fullName} (${user.id}) được ghép với ${agent.fullName} (${agent.id}) lúc ${formatTime(timestamp)} - phương thức: ${type}`);
    });

    useRoleChannelListener("request_timeout", (data) => {
        console.log("User received support request timeout:", data);
        addLog(`Log request_timeout mới`);
    });

    useRoleChannelListener("agent_accepted", (data) => {
        console.log("Agent accepted support request:", data);

        const {request, timestamp} = data;
        const {user, agent, type} = request;

        addLog(`${agent.fullName} (${agent.id}) chấp nhận yêu cầu từ ${user.fullName} (${user.id}) lúc ${formatTime(timestamp)} - phương thức: ${type}`);
    });

    useRoleChannelListener("agent_rejected", (data) => {
        console.log("Agent rejected support request:", data);

        const {request, timestamp} = data;
        const {user, agent, type} = request;

        addLog(`${agent.fullName} (${agent.id}) từ chối yêu cầu từ ${user.fullName} (${user.id}) lúc ${formatTime(timestamp)} - phương thức: ${type}`);
    });

    useRoleChannelListener("MATCHING_PROGRESS", (data) => {
        addLog("Log MATCHING_PROGRESS mới" );
    });

    useRoleChannelListener("CALL_REQUEST_UPDATE", (data) => {
        addLog("Log CALL_REQUEST_UPDATE mới" );
    });

    useRoleChannelListener("SYSTEM_ANNOUNCEMENT", (data) => {
        console.log("Log SYSTEM_ANNOUNCEMENT mới:", data);
        addLog("Log SYSTEM_ANNOUNCEMENT mới" );
    });

    useRoleChannelListener("call_ended", (data) => {
        console.log("Call ended notification:", data);
        const {endedBy, isUserEnded, timestamp} = data;
        const who = isUserEnded ? "User" : "Agent";
        addLog(`${who} (id: ${endedBy}) đã kết thúc cuộc gọi lúc ${formatTime(timestamp)}` );
    });

    useRoleChannelListener("permission_cancelled", (data) => {
        console.log("Permission cancelled notification:", data);
        const {cancelledBy, isUserCancelled, timestamp} = data;

        const who = isUserCancelled ? "User" : "Agent";
        addLog(`${who} (id: ${cancelledBy}) đã hủy cuộc gọi lúc ${formatTime(timestamp)}` );
    });

    const fetchTotals = useCallback(async () => {
        try {
        const [
            userRes,
            agentRes,
            callRes,
            metricRes,
        ] = await Promise.all([
            axios.get(`${API_BASE_URL}/user/total`),
            axios.get(`${API_BASE_URL}/agent/total`),
            axios.get(`${API_BASE_URL}/agent/call/total`),
            axios.get(`${API_BASE_URL}/record/summary`),
        ]);

        setUserOnlineCount(userRes.data.total);
        setAgentOnlineCount(agentRes.data.total);
        setCallCount(callRes.data.total);

        setAvgRating(metricRes.data.avgRating || 0);
        setTotalCalls(metricRes.data.totalCall || 0);
        setTotalCallTime(metricRes.data.totalCallTime || 0);

        } catch (err) {
        console.error("Error fetching totals:", err);
        }
    }, []);

    return{
        logs,
        userOnlineCount,
        agentOnlineCount,
        callCount,
        avgRating,
        totalCalls,
        totalCallTime,
        agentData,
        users,
        agents,
        
        setUsers,
        setAgents,
        fetchTotals,
    }
}