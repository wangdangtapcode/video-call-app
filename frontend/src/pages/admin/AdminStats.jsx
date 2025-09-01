// src/pages/admin/AdminStats.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const AdminStats = () => {
  const [chartData, setChartData] = useState(null);
  const [interval, setInterval] = useState("month");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => { fetchChartData(); }, [interval, selectedDate, selectedMonth]);

  const toUTC7 = (date) => new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString();

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const generateBuckets = (start, end, interval) => {
    const buckets = [];
    const current = new Date(start);
    if (interval === "hour") while (current <= end) { buckets.push(new Date(current)); current.setHours(current.getHours()+1); }
    else if (interval === "day") while (current <= end) { buckets.push(new Date(current)); current.setDate(current.getDate()+1); }
    else if (interval === "month") while (current <= end) { buckets.push(new Date(current)); current.setMonth(current.getMonth()+1); }
    return buckets;
  };

  const formatBucketLabel = (date, interval) => {
    const d = new Date(date);
    if (interval === "hour") return d.getHours().toString().padStart(2, "0")+":00";
    if (interval === "day") return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}`;
    if (interval === "month") return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
  };

  const fetchChartData = async () => {
    let start, end;
    const now = new Date();
    if (interval === "hour") {
      const date = selectedDate ? new Date(selectedDate) : now;
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    } else if (interval === "day") {
      const date = selectedMonth ? new Date(selectedMonth) : now;
      start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
      end = new Date(date.getFullYear(), date.getMonth()+1, 0, 23, 59, 59);
    } else {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const buckets = generateBuckets(start, end, interval);

    try {
      const res = await axios.get("http://localhost:8081/api/record/stats", {
        params: { interval, start: toUTC7(start), end: toUTC7(end) }
      });
      const data = res.data;
      const mergedData = buckets.map(b => {
        const d = data.find(item => new Date(item.bucket).getTime() === b.getTime());
        return { bucket: b, count: d?.count||0, sum: d?.sum||0 };
      });
      setChartData({
        labels: mergedData.map(d => formatBucketLabel(d.bucket, interval)),
        datasets: [
          { label: "Number of Calls", data: mergedData.map(d=>d.count), backgroundColor:"rgba(54,162,235,0.2)", borderColor:"rgba(54,162,235,1)", tension:0.3, fill:true },
          { label: "Total Call Time", data: mergedData.map(d=>d.sum), backgroundColor:"rgba(255,206,86,0.2)", borderColor:"rgba(255,206,86,1)", tension:0.3, fill:true },
        ],
        mergedData,
      });
    } catch(err){ console.error("Failed to fetch chart data", err);}
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">📈 Admin Stats</h1>
      </header>

      {/* Interval Selector */}
      <section className="flex flex-wrap space-x-4 space-y-2 items-center mt-6">
        <span>📅 Interval:</span>
        {["hour","day","month"].map(i=>(
          <button key={i} onClick={()=>setInterval(i)}
            className={`px-3 py-1 rounded-md font-medium ${interval===i?"bg-blue-600 text-white":"bg-gray-200"}`}>{i.toUpperCase()}</button>
        ))}
        {interval==="hour"&&<input type="date" value={selectedDate||""} onChange={e=>setSelectedDate(e.target.value)} className="border rounded-md px-2 py-1" />}
        {interval==="day"&&<input type="month" value={selectedMonth||""} onChange={e=>setSelectedMonth(e.target.value)} className="border rounded-md px-2 py-1" />}
      </section>

      {/* Charts */}
      {chartData && (
        <section className="flex flex-wrap gap-6 mt-6">
          <div className="bg-white p-4 shadow-md rounded-xl flex-1 min-w-[300px]">
            <h2 className="text-lg font-semibold mb-2">📈 Number of Calls Over Time</h2>
            <div className="h-64 overflow-auto">
              <Line
                data={{ labels: chartData.labels, datasets: [chartData.datasets[0]] }}
                options={{
                  responsive:true, maintainAspectRatio:false,
                  plugins: { legend:{position:"top", labels:{font:{size:12}}} },
                  scales: { x:{ ticks:{font:{size:10}} }, y:{ ticks:{font:{size:10}} } }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 shadow-md rounded-xl flex-1 min-w-[300px]">
            <h2 className="text-lg font-semibold mb-2">⏱ Total Call Time Over Time</h2>
            <div className="h-64 overflow-auto">
              <Line
                data={{ labels: chartData.labels, datasets: [chartData.datasets[1]] }}
                options={{
                  responsive:true, maintainAspectRatio:false,
                  plugins: { legend:{position:"top", labels:{font:{size:12}}} },
                  scales: {
                    x:{ ticks:{font:{size:10}} },
                    y:{ ticks:{font:{size:10}, callback: (value)=> {
                      if(value>=3600) return (value/3600).toFixed(1)+"h";
                      if(value>=60) return (value/60).toFixed(1)+"m";
                      return value+"s";
                    }}}
                  }
                }}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminStats;
