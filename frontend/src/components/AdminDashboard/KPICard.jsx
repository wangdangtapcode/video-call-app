import React from "react";

export default function KPICard ({ title, value, color }) {
    return(
        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center">
        <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-2">{title}</h3>
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        </div>
    );
}

