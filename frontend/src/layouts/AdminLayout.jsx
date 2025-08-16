import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Layout/Sidebar";
import { useUser } from "../context/UserContext";
import { useEffect } from "react";

export default function AdminLayout() {
    const { user, logout, isLoading, isInitialized, isAuthenticated } = useUser();
    const navigate = useNavigate();

    // Redirect to login if not authenticated (only after initialization)
    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                navigate("/login");
            } else if (user?.role?.name !== 'ADMIN') {
                // Redirect non-agents to appropriate dashboard
                navigate("/");
            } else {
                window.scrollTo(0, 0);
            }
        }
    }, [isInitialized, isAuthenticated, user, navigate]);

    // Show loading while initializing
    if (isLoading || !isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg text-gray-600">Đang khởi tạo...</p>
                </div>
            </div>
        );
    }

    // If initialized but no user, redirect will happen via useEffect
    if (!user) {
        return null;
    }
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar bám bên trái */}
      <Sidebar logout={logout}/>
      {/* Nội dung */}
      <main className="flex-1 overflow-auto ">
        <Outlet />
      </main>
    </div>
  );
}