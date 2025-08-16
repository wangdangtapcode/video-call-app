// Sidebar.jsx
import { Link } from "react-router-dom";

const menu = [
  { label: "Dashboard", link: "/admin", icon: "📊" },
  { label: "Users", link: "/admin/user", icon: "👥" },
];

export default function Sidebar({logout}) {

  return (
    <aside className="w-64 bg-gray-900 text-gray-200 flex flex-col h-screen">
        {/* Logo */}
        <div className="p-4 font-bold text-lg text-white">Logo</div>

        {/* Menu */}
        <nav className="flex-1 flex flex-col gap-1 mt-4">
            {menu.map((item) => (
                <Link
                    key={item.label}
                    to={item.link}
                    className="flex items-center gap-3 px-4 py-2 text-white hover:bg-green-600 rounded-lg"
                >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </Link>
            ))}
        </nav>

        {/* Logout button */}
        <button
            onClick={logout}
            className="mt-auto mb-4 mx-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
            🔒 Logout
        </button>
    </aside>
  );
}