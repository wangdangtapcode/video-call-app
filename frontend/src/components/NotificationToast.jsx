import { useState, useEffect } from 'react';

export const NotificationToast = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'request_assigned':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'AGENT_ACCEPTED':
      case 'REQUEST_ACCEPTED':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'AGENT_REJECTED':
      case 'REQUEST_REJECTED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'request_matched':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'request_assigned':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'AGENT_ACCEPTED':
      case 'REQUEST_ACCEPTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'AGENT_REJECTED':
      case 'REQUEST_REJECTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'request_matched':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border ${getNotificationStyle(notification.type)}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
              <p className="mt-1 text-xs opacity-75">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={handleClose}
                className="rounded-md inline-flex text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
