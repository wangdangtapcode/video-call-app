import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserSubscriptions } from "../../hooks/useUserSubscriptions";

export const AdminAgent = () => {
    return(
        <div className="p-6">
            {/* Dashboard Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">🤖Agent management</h1>
            </div>
        </div>     
    );
};