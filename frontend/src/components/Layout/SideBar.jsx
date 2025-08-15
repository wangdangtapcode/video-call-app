import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, LayoutDashboard, LogOut, Package, Settings, Users } from "lucide-react";
import { useUser } from "../../context/UserContext";



export default function SideBar() {
    const menu = [
        { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", link: "/admin" },
        { icon: <Users className="h-5 w-5" />, label: "Users", link:"/admin/user" },
        { icon: <Package className="h-5 w-5" />, label: "Products" },
        { icon: <BarChart3 className="h-5 w-5" />, label: "Reports" },
        { icon: <Settings className="h-5 w-5" />, label: "Settings" },
    ];
    const navigate = useNavigate();
    const { user, logout } = useUser();

    const handleLogout = () =>{
        logout();
        navigate("/login");
    }
    return (
        <aside className="w-64 bg-white border-r border-gray-200 p-3 min-h-screen">
            <div className="mb-4 px-3">
                <p className="text-sm text-gray-500">Xin chào admin</p>
                <p className="font-semibold text-gray-800">{user?.fullName || "User"}</p>
            </div>

            <nav className="flex flex-col gap-1">
                {menu.map((m) => (
                <Link
                    key={m.label}
                    to={m.link || "#"}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-left"
                >
                    {m.icon}
                    <span className="text-sm">{m.label}</span>
                </Link>
                ))}
            </nav>
            <div className="h-px my-3 bg-gray-100" />
            <button
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 w-full text-left"
                onClick={handleLogout}
            >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Logout</span>
            </button>
        </aside>
    );
}
