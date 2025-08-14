import React from 'react';
import { UserProvider } from './UserContext';
import { WebSocketProvider } from './WebSocketContext';


export const AppProvider = ({ children }) => {
  return (
    <UserProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </UserProvider>
  );
};

/**
 * Convenience hook để sử dụng context dễ dàng
 */
export const useApp = () => {
  const { useUser } = require('./UserContext');
  
  return {
    user: useUser()
  };
};

export default AppProvider;
