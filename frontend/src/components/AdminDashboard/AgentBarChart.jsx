// src/components/Dashboard/AgentBarChart.jsx
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AgentBarChart({ data }) {
  // data = [{ user: "Agent A", totalCalls: 12, totalCallTime: 3600 }, ...]
  const labels = data.map(d => d.user);
  const totalCalls = data.map(d => d.totalCalls);
  const totalCallTime = data.map(d => d.totalCallTime / 60); // chuyển sang phút

  const chartData = {
    labels,
    datasets: [
      {
        label: "Total Calls",
        data: totalCalls,
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
      {
        label: "Total Call Time (min)",
        data: totalCallTime,
        backgroundColor: "rgba(255, 99, 132, 0.7)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { position: "top" } },
  };

  return <Bar data={chartData} options={options} />;
}
