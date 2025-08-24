import { useEffect, useState } from "react";
import { useWebSocket } from "../../context/WebSocketContext";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Bubble } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import KPICard from "../../components/AdminDashboard/KPICard";

// import KPICard from "../../components/AdminDashboard/KPICard";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip, Legend);

export const AdminDashboard = () => {
  const { client, connect } = useWebSocket();

  // KPI states
  const [userOnlineCount, setUserOnlineCount] = useState(0);
  const [agentOnlineCount, setAgentOnlineCount] = useState(0);
  const [callCount, setCallCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalCallTime, setTotalCallTime] = useState(0);

  // Agent metrics for charts
  const [agentData, setAgentData] = useState([]);

  const API_BASE_URL = "http://localhost:8081/api";

  const fetchTotals = async () => {
    try {
      const [
        userRes,
        agentRes,
        callRes,
        metricRes,
        agentMetricsRes
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/total`),
        axios.get(`${API_BASE_URL}/agent/total`),
        axios.get(`${API_BASE_URL}/agent/call/total`),
        axios.get(`${API_BASE_URL}/agent/summary`),
        axios.get(`${API_BASE_URL}/agent/all`) // [{user, totalCalls, totalCallTime, rating}, ...]
      ]);

      setUserOnlineCount(userRes.data.total);
      setAgentOnlineCount(agentRes.data.total);
      setCallCount(callRes.data.total);

      setAvgRating(metricRes.data.avgRating || 0);
      setTotalCalls(metricRes.data.totalCalls || 0);
      setTotalCallTime(metricRes.data.totalCallTime || 0);

      setAgentData(agentMetricsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTotals();
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.token && userData.user) {
      connect(userData.token, userData.user);
    }
  }, [connect]);

  useEffect(() => {
    if (!client) return;
    const subscription = client.subscribe("/topic/users/status-changes", () => {
      fetchTotals();
    });
    return () => subscription.unsubscribe();
  }, [client]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // const KPICard = ({ title, value, color }) => (
  //   <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center">
  //     <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-2">{title}</h3>
  //     <span className={`text-3xl font-bold ${color}`}>{value}</span>
  //   </div>
  // );

  // Chart data
  const barChartData = {
    labels: agentData.map(d => d.fullName + " " + d.id),
    datasets: [
      {
        label: "Total Calls",
        data: agentData.map(d => d.totalCalls),
        backgroundColor: "rgba(54, 162, 235, 0.7)"
      },
      {
        label: "Total Call Time (min)",
        data: agentData.map(d => d.totalCallTime / 60),
        backgroundColor: "rgba(255, 99, 132, 0.7)"
      }
    ]
  };

  const bubbleChartData = {
    datasets: agentData.map(d => ({
      label: d.fullName+" "+d.id,
      data: [{ x: d.totalCalls, y: d.totalCallTime / 60, r: d.rating * 3 }],
      backgroundColor: "rgba(54, 162, 235, 0.7)"
    }))
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } }
  };

  const bubbleOptions = {
    responsive: true,
    plugins: { legend: { display: true, position: "right" } },
    scales: {
      x: { title: { display: true, text: "Total Calls" } },
      y: { title: { display: true, text: "Total Call Time (min)" } }
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">📊 Admin Dashboard</h1>
      </div>

      {/* KPI Cards: 2 hàng 3 cột */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Users Online" value={userOnlineCount} color="text-green-600" />
        <KPICard title="Agents Online" value={agentOnlineCount} color="text-blue-600" />
        <KPICard title="Calls Running" value={callCount} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Average Rating" value={avgRating.toFixed(2)} color="text-indigo-600" />
        <KPICard title="Total Calls" value={totalCalls} color="text-purple-600" />
        <KPICard title="Total Call Time" value={formatTime(totalCallTime)} color="text-yellow-600" />
      </div>

      {/* Charts: 2 chart cạnh nhau trên desktop, stack trên mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 shadow-md rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Top Agent Comparison</h2>
          <Bar data={barChartData} options={chartOptions} />
        </div>

        <div className="bg-white p-6 shadow-md rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Agent Performance (Calls vs Time vs Rating)</h2>
          <Bubble data={bubbleChartData} options={bubbleOptions} />
        </div>
      </div>
    </div>
  );
};
