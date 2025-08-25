// src/components/Dashboard/AgentBubbleChart.jsx
import { Bubble } from "react-chartjs-2";
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from "chart.js";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export default function AgentBubbleChart({ data }) {
  // data = [{ user: "Agent A", totalCalls: 12, totalCallTime: 3600, rating: 4.5 }, ...]
  const chartData = {
    datasets: data.map(d => ({
      label: d.user,
      data: [{ x: d.totalCalls, y: d.totalCallTime / 60, r: d.rating * 3 }], // r = rating * 3 để scale size
      backgroundColor: "rgba(54, 162, 235, 0.7)",
    })),
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: true, position: "right" } },
    scales: {
      x: { title: { display: true, text: "Total Calls" } },
      y: { title: { display: true, text: "Total Call Time (min)" } },
    },
  };

  return <Bubble data={chartData} options={options} />;
}
