import { createContext, useContext, useState, useRef, useEffect } from "react";

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
      throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
  };


  export const NotificationProvider = ({ children, userId, userRole }) => {
    const [notifications, setNotifications] = useState([]);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef(null);
  
    // Âm thanh thông báo
    useEffect(() => {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmccBjGH0fPTgjMGHm7A7+OZURE');
    }, []);
  
  
  
    const addNotification = (notification) => {
      const newNotification = {
        id: notification.id || Date.now() + Math.random(),
        type: notification.type || 'info', // success, error, warning, info
        title: notification.title,
        message: notification.message,
        timestamp: new Date().toISOString(),
        read: false,
        autoHide: notification.autoHide !== false, // mặc định là true
        duration: notification.duration || 5000,
        action: notification.action,
        ...notification
      };
  
      setNotifications(prev => [newNotification, ...prev]);
  
      // Phát âm thanh thông báo
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
  
      // Tự động ẩn thông báo
      if (newNotification.autoHide) {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, newNotification.duration);
      }
    };
  
    const removeNotification = (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    };
  
    const markAsRead = (id) => {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    };
  
    const clearAll = () => {
      setNotifications([]);
    };
  
    const toggleSound = () => {
      setSoundEnabled(prev => !prev);
    };
  
    // API để tạo thông báo từ code
    const createNotification = (notification) => {
      addNotification(notification);
    };
  
    const value = {
      notifications,
      soundEnabled,
      addNotification: createNotification,
      removeNotification,
      markAsRead,
      clearAll,
      toggleSound
    };
  
    return (
      <NotificationContext.Provider value={value}>
        {children}
      </NotificationContext.Provider>
    );
  };