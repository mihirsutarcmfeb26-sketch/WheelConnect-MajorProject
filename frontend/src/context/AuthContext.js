import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = window.sessionStorage.getItem('wc_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return window.sessionStorage.getItem('wc_jwt_token') || null;
  });

  const setAuth = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    window.sessionStorage.setItem('wc_jwt_token', authToken);
    window.sessionStorage.setItem('wc_user', JSON.stringify(userData));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    window.sessionStorage.removeItem('wc_jwt_token');
    window.sessionStorage.removeItem('wc_user');
  };

  const getToken = () => {
    return window.sessionStorage.getItem('wc_jwt_token');
  };

  const getRole = () => {
    return user ? user.role : null;
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, clearAuth, getToken, getRole, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
