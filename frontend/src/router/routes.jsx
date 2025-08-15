import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";
import { LayoutDefault } from "../components/Layout/LayoutDefault";
import { UserDashboard } from "../pages/user/UserDashboard";
import { AgentDashboard } from "../pages/agent/AgentDashboard";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminLayout } from "../components/Layout/AdminLayout";
import AdminUser from "../pages/admin/AdminUser";
export const Routers = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutDefault />}>
          {/*User Dashboard*/}
          <Route path="/" element={<UserDashboard />} />

          {/*Agent Dashboard*/}
          <Route path="/agent" element={<AgentDashboard />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          {/*Admin Dashboard*/}
          <Route index element={<AdminDashboard />} />
          <Route path="user" element={<AdminUser/>}/>
        </Route>

        {/*Login*/}
        <Route path="/login" element={<Login />} />

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Routers;
