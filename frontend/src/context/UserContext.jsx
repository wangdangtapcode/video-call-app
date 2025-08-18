import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Action types
const USER_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UPDATE_STATUS: 'UPDATE_STATUS',
  SET_LOADING: 'SET_LOADING',
  INIT_COMPLETE: 'INIT_COMPLETE'
};

// Initial state
const initialState = {
  user: null,
  userMetric: null, // Thông tin agent (nếu user là agent)
  token: null, // JWT token
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
        userMetric: action.payload.userMetric || null,
        token: action.payload.token || null,
        isLoading: false,
        isInitialized: true
      };
    
    case USER_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        userMetric: null,
        token: null,
        isLoading: false,
        isInitialized: true
      };
    
    case USER_ACTIONS.UPDATE_STATUS:
      return {
        ...state,
        userMetric: {
          ...state.userMetric,
          status: action.payload
        }
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

// Load từ sessionStorage
useEffect(() => {
  const initializeUser = async () => {
    try {
      const savedUserData = sessionStorage.getItem('userData');
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        if (userData.token) {
          dispatch({ type: USER_ACTIONS.LOGIN, payload: userData });
        } else {
          sessionStorage.removeItem('userData');
          dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
        }
      } else {
        dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
      }
    } catch (error) {
      console.error('Error parsing saved user data:', error);
      sessionStorage.removeItem('userData');
      dispatch({ type: USER_ACTIONS.INIT_COMPLETE });
    }
  };
  initializeUser();
}, []);

// Save vào sessionStorage
useEffect(() => {
  if (state.user && state.token) {
    const userData = {
      user: state.user,
      userMetric: state.userMetric,
      token: state.token
    };
    sessionStorage.setItem('userData', JSON.stringify(userData));
  } else {
    sessionStorage.removeItem('userData');
  }
}, [state.user, state.userMetric, state.token]);

  // Action functions
  const login = (userData) => {
    dispatch({ type: USER_ACTIONS.LOGIN, payload: userData });
  };

  const logout = () => {
    dispatch({ type: USER_ACTIONS.LOGOUT });
    sessionStorage.removeItem('userData');
  };

  const updateStatus = (status) => {
    dispatch({ type: USER_ACTIONS.UPDATE_STATUS, payload: status });
  };

  const value = {
    // State
    user: state.user,
    userMetric: state.userMetric,
    token: state.token,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    isAuthenticated: !!state.user,
    isAgent: !!state.userMetric,
    // Actions
    login,
    logout,
    updateStatus,
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
