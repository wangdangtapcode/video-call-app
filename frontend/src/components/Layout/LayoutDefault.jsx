import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "./Header";
import { useWebSocket } from "../../context/WebSocketContext";

export const LayoutDefault = () => {
  

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
