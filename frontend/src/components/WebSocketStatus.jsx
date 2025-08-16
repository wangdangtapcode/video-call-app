import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useUser } from '../context/UserContext';

export const WebSocketStatus = () => {
  const { isConnected, connectionStatus } = useWebSocket();
  const { user } = useUser();

  if (!user) return null;

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'disconnected': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Đã kết nối';
      case 'connecting': return 'Đang kết nối...';
      case 'error': return 'Lỗi kết nối';
      case 'disconnected': return 'Mất kết nối';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium text-gray-700">
          WebSocket: {getStatusText()}
        </span>
      </div>
      {user && (
        <div className="text-xs text-gray-500 mt-1">
          User: {user.fullName} ({user.role.name})
        </div>
      )}
    </div>
  );
};
