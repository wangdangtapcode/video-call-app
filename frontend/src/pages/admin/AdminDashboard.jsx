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
import { useUserSubscriptions } from "../../hooks/useUserSubscriptions";
import StarRating from "../../components/AdminDashboard/StarRating";

// import KPICard from "../../components/AdminDashboard/KPICard";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip, Legend);

export const AdminDashboard = () => {

  const {userOnlineCount, agentOnlineCount, callCount, avgRating,
    totalCalls, totalCallTime, agentData, logs, fetchTotals} = useUserSubscriptions();

  useEffect(() => {
    fetchTotals();
  }, []);


  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };


  const barChartData = {
    labels: agentData.map(d => d.fullName + " " + d.id),
    datasets: [
      {
        label: "Total Calls",
        data: agentData.map(d => d.totalCall),
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
    datasets: agentData.map((d, i) => {
      const hue = (i * 40) % 360; // xoay vòng quanh color wheel
      return {
        label: `${d.fullName} ${d.id}`,
        data: [{ x: d.totalCall, y: d.totalCallTime / 60, r: d.rating*5}],
        backgroundColor: `hsla(${hue}, 70%, 50%, 0.7)`
      };
    })
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } }
  };

  const bubbleOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "right" },
      tooltip: {
        callbacks: {
          label: function (context) {
            const data = context.raw; // {x, y, r}
            const dataset = context.dataset;
            const agentLabel = dataset.label || "";

            // y hiện đang là phút, nên đổi lại giây (hoặc hiển thị cả 2)
            const callTimeMin = data.y;
            const callTimeSec = callTimeMin * 60;

            return `${agentLabel} | Calls: ${data.x}, Time: ${callTimeSec}s (${callTimeMin.toFixed(1)} min), Rating: ${(data.r / 5).toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: "Total Calls" } },
      y: { title: { display: true, text: "Total Call Time (min)" } }
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">📊 Admin Dashboard</h1>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard title="Users Online" value={userOnlineCount} color="text-green-600" />
        <KPICard title="Agents Online" value={agentOnlineCount} color="text-blue-600" />
        <KPICard title="Calls Running" value={callCount} color="text-red-600" />
        <KPICard title="Average Rating" value={<StarRating rating={avgRating} />} color="text-indigo-600" />
        <KPICard title="Total Calls" value={totalCalls} color="text-purple-600" />
        <KPICard title="Total Call Time" value={formatTime(totalCallTime)} color="text-yellow-600" />
      </section>

      {/* Logs Section */}
      <section className="bg-white p-6 shadow-md rounded-xl">
        <h2 className="text-lg font-semibold mb-4">📜 Logs</h2>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-200">
          {logs && logs.length > 0 ? (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="p-2 hover:bg-gray-100 flex justify-between items-center text-sm"
              >
                <div>
                  <span className="font-semibold text-gray-800">{log.fullName}</span>{" "}
                  (<span className="text-gray-500">ID: {log.userId}</span>)
                  {" - "}
                  <span
                    className={`font-medium ${
                      log.status === "ONLINE"
                        ? "text-green-600"
                        : log.status === "OFFLINE"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <div className="text-gray-400 text-xs">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">No logs available</p>
          )}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow-md rounded-xl h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Top Agent Comparison</h2>
          <Bar data={barChartData} options={chartOptions} />
        </div>

        <div className="bg-white p-6 shadow-md rounded-xl h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Agent Performance (Calls vs Time vs Rating)</h2>
          <Bubble data={bubbleChartData} options={bubbleOptions} />
        </div>
      </section>
    </div>
  );

};
