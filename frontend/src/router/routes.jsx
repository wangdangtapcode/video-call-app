import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";
import { LayoutDefault } from "../components/Layout/LayoutDefault";
import { UserDashboard } from "../pages/user/UserDashboard";
import { AgentDashboard } from "../pages/agent/AgentDashboard";
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
        
        {/*Login*/}
        <Route path="/login" element={<Login />} />

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Routers;
