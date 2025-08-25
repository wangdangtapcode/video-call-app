import React from 'react';
import { useNotification } from '../context/NotificationContext';
import { Notification } from './Notification';

export const NotificationContainer = () => {
  const { notifications, removeNotification, markAsRead } = useNotification();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.slice(0, 5).map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onRead={() => markAsRead(notification.id)}
        />
      ))}
    </div>
  );
};
