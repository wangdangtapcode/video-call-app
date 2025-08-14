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
  agent: null, // Thông tin agent (nếu user là agent)
  isLoading: true, // Loading khi app khởi động
  isInitialized: false // Đã khởi tạo xong chưa
};

// Reducer
const userReducer = (state, action) => {
  switch (action.type) {
    case USER_ACTIONS.LOGIN:
      return {
        ...state,
        user: action.payload.user,
        agent: action.payload.agent || null,
        isLoading: false,
        isInitialized: true
      };
    
    case USER_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        agent: null,
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
        const savedUserData = localStorage.getItem('userData');
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          dispatch({ type: USER_ACTIONS.LOGIN, payload: userData });
        } else {
          dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('userData');
        dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
      }
    };

    initializeUser();
  }, []);

  // Save user data to localStorage whenever user or agent changes
  useEffect(() => {
    if (state.user) {
      const userData = {
        user: state.user,
        agent: state.agent
      };
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      localStorage.removeItem('userData');
    }
  }, [state.user, state.agent]);

  // Action functions
  const login = (userData) => {
    dispatch({ type: USER_ACTIONS.LOGIN, payload: userData });
  };

  const logout = () => {
    dispatch({ type: USER_ACTIONS.LOGOUT });
    localStorage.removeItem('userData');
  };

  const value = {
    // State
    user: state.user,
    agent: state.agent,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    isAuthenticated: !!state.user,
    isAgent: !!state.agent,
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
