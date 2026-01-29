// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:3002';

interface User {
  id: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('accessToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(() => {
    // Redirect to Google OAuth
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `${API_URL}/auth/google?redirect=${encodeURIComponent(currentPath)}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  }, []);

  const handleAuthCallback = useCallback((accessToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  return {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    handleAuthCallback,
  };
}