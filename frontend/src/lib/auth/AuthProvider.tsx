// src/lib/auth/AuthProvider.tsx
"use client"

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './context';
import { User } from './types';
import { setCookie, getCookie, deleteCookie } from './cookie-utils'; // We'll create this

// Add error translation function from AuthContext.tsx
const translateError = (error: any) => {
  if (error?.type === 'VALIDATION') {
    if (error.message.includes('password')) {
      return 'Please check your password requirements';
    }
    if (error.message.includes('email')) {
      return 'Please enter a valid email address';
    }
    return 'Please check your input';
  }
  if (error?.type === 'DUPLICATE') {
    return 'This email is already registered';
  }
  return 'An unexpected error occurred. Please try again.';
};

// Token refresh threshold (5 minutes before expiry)
interface AuthProviderProps {
  children: ReactNode;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface TokenData {
  token: string;
  expiresAt: number;
}

const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const COOKIE_OPTIONS = { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<TokenData | null>(null);
  const router = useRouter();

  // Parse JWT and extract expiration
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const parsed = JSON.parse(jsonPayload);
      return {
        token,
        expiresAt: parsed.exp * 1000 // Convert to milliseconds
      };
    } catch (e) {
      return null;
    }
  };

  // Fetch user profile
  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const data = await response.json();
      setUser(data.data);
    } catch (error) {
      console.error('Profile fetch error:', error);
      setUser(null);
    }
  }, []);

  // Refresh token
  const refreshTokens = useCallback(async (): Promise<TokenData | null> => {
    // Get token from cookie instead of localStorage
    const storedRefreshToken = getCookie('refreshToken');
    if (!storedRefreshToken) return null;

    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data: TokenResponse = await response.json();
      const parsedToken = parseJwt(data.accessToken);
      
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie instead of localStorage
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      setAccessToken(parsedToken);
      return parsedToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Remove from cookie instead of localStorage
      deleteCookie('refreshToken');
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Setup token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    const timeUntilRefresh = accessToken.expiresAt - Date.now() - REFRESH_THRESHOLD;
    
    if (timeUntilRefresh <= 0) {
      refreshTokens();
      return;
    }

    const refreshInterval = setInterval(refreshTokens, timeUntilRefresh);
    return () => clearInterval(refreshInterval);
  }, [accessToken, refreshTokens]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const newToken = await refreshTokens();
        if (newToken) {
          await fetchUserProfile(newToken.token);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [fetchUserProfile, refreshTokens]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw data.error || new Error('Invalid credentials');
      }

      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie instead of localStorage
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      setAccessToken(parsedToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      // Use the error translation function
      setError(translateError(error));
      setUser(null);
      setAccessToken(null);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw data.error || new Error('Signup failed');
      }

      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie instead of localStorage
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      setAccessToken(parsedToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      // Use the error translation function
      setError(translateError(error));
      setUser(null);
      setAccessToken(null);
    }
  };

  const logout = async () => {
    try {
      // Get token from cookie instead of localStorage
      const refreshToken = getCookie('refreshToken');
      if (refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove from cookie instead of localStorage
      deleteCookie('refreshToken');
      setAccessToken(null);
      setUser(null);
      router.push('/auth/login');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      signup,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};