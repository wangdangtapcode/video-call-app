import React from 'react';
import { useAgentPresence } from '../../hooks/useAgentPresence';
import { AgentStatusIndicator } from './AgentStatusIndicator';

/**
 * Component hiển thị danh sách tất cả agents với trạng thái real-time
 */
export const AgentStatusList = ({ className = '' }) => {
  const { agentStatuses, isLoading, getAgentCounts } = useAgentPresence();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  const agentCounts = getAgentCounts();
  const agentList = Array.from(agentStatuses.entries()).map(([userId, agentData]) => ({
    userId,
    ...agentData
  }));

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Trạng thái Agents</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {agentCounts.ONLINE} Online
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              {agentCounts.BUSY} Bận
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
              {agentCounts.OFFLINE} Offline
            </span>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="p-6">
        {agentList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Không có agents nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agentList.map(({ userId, status, user, timestamp }) => (
              <div
                key={userId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  
                  {/* Agent Info */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.fullName || `Agent ${userId}`}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Status & Timestamp */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <AgentStatusIndicator status={status} size="sm" />
                    {timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(timestamp).toLocaleTimeString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
