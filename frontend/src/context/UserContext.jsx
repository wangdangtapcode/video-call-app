import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Action types
const USER_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  INIT_COMPLETE: 'INIT_COMPLETE'
};

// Initial state
const initialState = {
  user: null,
  isLoading: true, // Loading khi app khởi động
  isInitialized: false // Đã khởi tạo xong chưa
};

// Reducer
const userReducer = (state, action) => {
  switch (action.type) {
    case USER_ACTIONS.LOGIN:
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        isInitialized: true
      };
    
    case USER_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isLoading: false,
        isInitialized: true
      };
    
    case USER_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case USER_ACTIONS.INIT_COMPLETE:
      return {
        ...state,
        isLoading: false,
        isInitialized: true
      };
    
    default:
      return state;
  }
};

// Create Context
const UserContext = createContext();

// UserProvider Component
export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load user from localStorage on app start
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          dispatch({ type: USER_ACTIONS.LOGIN, payload: user });
        } else {
          dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user');
        dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
      }
    };

    initializeUser();
  }, []);

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('user');
    }
  }, [state.user]);

  // Action functions
  const login = (userData) => {
    dispatch({ type: USER_ACTIONS.LOGIN, payload: userData });
  };

  const logout = () => {
    dispatch({ type: USER_ACTIONS.LOGOUT });
    localStorage.removeItem('user');
  };

  const value = {
    // State
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    isAuthenticated: !!state.user,
    // Actions
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};

export default UserContext;
