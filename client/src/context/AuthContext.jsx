import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlerts = async () => {
    try {
      if (localStorage.getItem('token')) {
        const res = await api.get('/dashboard/alerts');
        setAlertCount(res.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch alert count:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('user', JSON.stringify(res.user));
            await fetchAlerts();
          }
        } catch (err) {
          console.error('Auth verification failed:', err);
          // Only logout if 401 Unauthorized explicitly returned
          if (err.message && err.message.includes('expired')) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password, requestedRole) => {
    const res = await api.post('/auth/login', { email, password, requestedRole });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    await fetchAlerts();
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setAlertCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        alertCount,
        login,
        logout,
        refreshAlerts: fetchAlerts,
        isManager: user?.role === 'MANAGER' || user?.role === 'ADMIN',
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
