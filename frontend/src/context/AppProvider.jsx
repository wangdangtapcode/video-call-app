import React from 'react';
import { UserProvider, useUser } from './UserContext';
import { WebSocketProvider } from './WebSocketContext';
import { NotificationProvider } from './NotificationContext';
import { NotificationContainer } from '../components/NotificationContainer';

const AppProviderInner = ({ children }) => {
  const { user } = useUser();
  
  return (
    <WebSocketProvider>
      <NotificationProvider userId={user?.id} userRole={user?.role}>
        {children}
        <NotificationContainer />
      </NotificationProvider>
    </WebSocketProvider>
  );
};

export const AppProvider = ({ children }) => {
  return (
    <UserProvider>
      <AppProviderInner>
        {children}
      </AppProviderInner>
    </UserProvider>
  );
};

// /**
//  * Convenience hook để sử dụng context dễ dàng
//  */
// export const useApp = () => {
//   const { useUser } = require('./UserContext');
  
//   return {
//     user: useUser()
//   };
// };

export default AppProvider;
