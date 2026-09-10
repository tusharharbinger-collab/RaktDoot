import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('delivery_user'));
      if (u && (u.role === 'admin' || u.role === 'manager')) {
        return u;
      }
      // If previous session was a driver or invalid, clear it
      localStorage.removeItem('delivery_user');
      localStorage.removeItem('delivery_token');
      return null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('delivery_user'));
      if (u && (u.role === 'admin' || u.role === 'manager')) {
        return localStorage.getItem('delivery_token');
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token: t, user: u } = data.data;

      // Web portal is strictly restricted to Manager and Admin roles only
      if (u.role !== 'admin' && u.role !== 'manager') {
        const restrictedMsg = 'Access denied: Only Managers and Administrators can sign in to the web portal. Drivers must use the Driver Mobile App.';
        setError(restrictedMsg);
        throw new Error(restrictedMsg);
      }

      localStorage.setItem('delivery_token', t);
      localStorage.setItem('delivery_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
      return u;
    } catch (err) {
      const msg = (err.message && err.message.startsWith('Access denied'))
        ? err.message
        : (err.response?.data?.message || 'Login failed. Check credentials.');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
    setToken(null);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
