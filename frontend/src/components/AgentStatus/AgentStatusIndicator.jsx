import React from 'react';

/**
 * Component hiển thị trạng thái agent với indicator màu sắc
 */
export const AgentStatusIndicator = ({ 
  status = 'OFFLINE', 
  size = 'sm', 
  showText = true, 
  className = '' 
}) => {
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ONLINE': return 'bg-green-500';
      case 'BUSY': return 'bg-red-500';
      case 'OFFLINE': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'ONLINE': return 'Trực tuyến';
      case 'BUSY': return 'Bận';
      case 'OFFLINE': return 'Ngoại tuyến';
      default: return 'Không xác định';
    }
  };

  const getSizeClass = (size) => {
    switch (size) {
      case 'xs': return 'w-2 h-2';
      case 'sm': return 'w-3 h-3';
      case 'md': return 'w-4 h-4';
      case 'lg': return 'w-5 h-5';
      default: return 'w-3 h-3';
    }
  };

  const getTextSize = (size) => {
    switch (size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      default: return 'text-sm';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`rounded-full ${getStatusColor(status)} ${getSizeClass(size)}`}></div>
      {showText && (
        <span className={`font-medium text-gray-900 ${getTextSize(size)}`}>
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
};
