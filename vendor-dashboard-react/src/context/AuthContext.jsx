import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('vendor_token');
    if (!token) { setLoading(false); return; }
    try {
      const response = await axios.get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setUser(response.data.user);
      else localStorage.removeItem('vendor_token');
    } catch { localStorage.removeItem('vendor_token'); }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
      if (response.data.success) {
        localStorage.setItem('vendor_token', response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      setError(response.data.error);
      return { success: false, error: response.data.error };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (data) => {
    try {
      setError(null);
      const response = await axios.post(`${API_BASE}/auth/register`, data);
      if (response.data.success) return { success: true };
      setError(response.data.error);
      return { success: false, error: response.data.error };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('vendor_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};