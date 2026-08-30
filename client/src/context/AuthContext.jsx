import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlerts = async () => {
    try {
      if (localStorage.getItem('token')) {
        const res = await api.get('/dashboard/alerts');
        setAlertCount(res.count);
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
          setUser(res.user);
          await fetchAlerts();
        } catch (err) {
          console.error('Auth verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password, requestedRole) => {
    const res = await api.post('/auth/login', { email, password, requestedRole });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    await fetchAlerts();
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
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
        isManager: user?.role === 'MANAGER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
