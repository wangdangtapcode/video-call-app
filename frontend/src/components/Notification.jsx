import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Phone, MessageSquare, User, Info, Clock, X } from 'lucide-react';




export const Notification = ({ notification, onClose, onRead }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(), 300);
  };

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    if (notification.action) {
      notification.action();
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'call':
        return <Phone className="w-6 h-6 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-6 h-6 text-purple-500" />;
      case 'user':
        return <User className="w-6 h-6 text-indigo-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'call':
        return 'bg-blue-50 border-blue-200';
      case 'message':
        return 'bg-purple-50 border-purple-200';
      case 'user':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`transform transition-all duration-500 ease-in-out pointer-events-auto ${
        isVisible && !isLeaving
          ? 'scale-100 opacity-100 translate-y-0'
          : isLeaving
          ? 'scale-95 opacity-0 -translate-y-2'
          : 'scale-95 opacity-0 translate-y-2'
      }`}
    >
      <div
        className={`${getBgColor()} backdrop-blur-sm rounded-2xl shadow-2xl border-2 p-6 cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105 min-w-80 max-w-md ${
          !notification.read ? 'ring-4 ring-blue-200 ring-opacity-50' : ''
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0 mt-1">
              <div className="p-2 rounded-full bg-white/80 shadow-sm">
                {getIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {notification.message}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar cho auto-hide notifications */}
        {notification.autoHide && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-shrink-width"
              style={{
                animation: `shrinkWidth ${notification.duration}ms linear`
              }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};
