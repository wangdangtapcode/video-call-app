import React from 'react';
import { UserProvider } from './UserContext';

/**
 * AppProvider - Wrapper cho UserContext
 * 
 * Hiện tại chỉ có UserContext, nhưng có thể mở rộng sau này
 */
export const AppProvider = ({ children }) => {
  return (
    <UserProvider>
      {children}
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
