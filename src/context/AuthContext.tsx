import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, loginApi } from '../services/api/authApiService';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'tallyweb_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCurrentUser(token);
      setUser(result.user);
    } catch (err) {
      logout();
      setError(err instanceof Error ? err.message : 'Unable to refresh session');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginApi(email, password);
      setToken(result.token);
      localStorage.setItem(STORAGE_KEY, result.token);
      setUser(result.user);
    } catch (err) {
      logout();
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token]);

  const can = (permission: string) => {
    return !!user?.permissions?.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, refreshUser, can }}>
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
