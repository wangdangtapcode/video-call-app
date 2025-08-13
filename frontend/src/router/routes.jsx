 
 import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";

 
 export const  Routers = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/*Login*/}
        <Route path="/login" element={<Login />} />


        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Routers;