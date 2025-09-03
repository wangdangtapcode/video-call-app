import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "./Header";
import { useWebSocket } from "../../context/WebSocketContext";
import { useUserSubscriptions } from "../../hooks/useUserSubscriptions";
import { useUser } from "../../context/UserContext";

export const LayoutDefault = () => {
  
  const {isBlockModalOpen, message} = useUserSubscriptions();
  const {logout} = useUser();
  const { disconnect } = useWebSocket();

  const handleBlockOk = () => {
    disconnect();
    logout();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>

      {isBlockModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg w-96 text-center">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              🚨 You have been logged out
            </h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleBlockOk}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              OK
            </button>
          </div>
        </div>
    )}
    </div>
  );
};
