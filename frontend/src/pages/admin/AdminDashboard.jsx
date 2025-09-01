import { useEffect } from "react";
import KPICard from "../../components/AdminDashboard/KPICard";
import StarRating from "../../components/AdminDashboard/StarRating";
import { useAdminSubscriptions } from "../../hooks/useAdminSubscriptions";

export const AdminDashboard = () => {
  const {
    userOnlineCount,
    agentOnlineCount,
    callCount,
    avgRating,
    totalCalls,
    totalCallTime,
    logs,
    fetchTotals,
  } = useAdminSubscriptions();

  useEffect(() => {
    fetchTotals();
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
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
              <div key={idx} className="p-2 hover:bg-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-700">{log}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">No logs available</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
