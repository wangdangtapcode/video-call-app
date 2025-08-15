import React from "react";
import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";


export const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar always visible on the left */}
      <SideBar/>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};
