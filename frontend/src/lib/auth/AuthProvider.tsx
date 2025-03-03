// src/lib/auth/AuthProvider.tsx
"use client"

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './context';
import { User } from './types';
import { setCookie, getCookie, deleteCookie } from './cookie-utils'; // We'll create this
import { API_ENDPOINTS } from '@/config/api';

// The backend API URL is configured from environment variables
const API_BASE_URL = typeof window === 'undefined' 
  ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'  // Server-side rendering
  : window.location.origin.includes('localhost') 
    ? 'http://localhost:3001'  // Local development
    : '/api';  // Production/Docker - use relative path to avoid DNS issues

console.log(`Using API base URL: ${API_BASE_URL}`);
console.log(`Auth endpoints: Signup=${API_ENDPOINTS.AUTH.SIGNUP}`);

// For debugging CORS issues
console.log('Running in environment:', process.env.NODE_ENV);
console.log('Full signup URL:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.SIGNUP}`);

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
  payload?: Record<string, any>;
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
  const parseJwt = (token: string): TokenData | null => {
    if (!token) return null;
    
    try {
      // Split the token into its three parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Get the payload section (middle part)
      const payloadBase64 = parts[1];
      
      // Create proper base64 string by adding padding if needed
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      
      // Use a safer approach to decode base64
      let jsonPayload: string;
      if (typeof window !== 'undefined') {
        // Browser environment
        const binary = window.atob(paddedBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        jsonPayload = new TextDecoder().decode(bytes);
      } else {
        // Node.js environment (for SSR)
        jsonPayload = Buffer.from(paddedBase64, 'base64').toString();
      }
      
      // Parse the JSON payload
      const payload = JSON.parse(jsonPayload);
      
      // Verify that we have an expiration
      if (!payload.exp) {
        throw new Error('Token missing expiration');
      }
      
      return {
        token,
        expiresAt: payload.exp * 1000, // Convert seconds to milliseconds
        payload // Include full payload for additional claims if needed
      };
    } catch (error) {
      console.warn('Error parsing JWT:', error);
      return null;
    }
  };

  // Fetch user profile
  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      console.log(`Fetching user profile from ${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE}`);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        mode: 'cors'
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
      console.log(`Sending refresh token request to ${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data: TokenResponse = await response.json();
      const parsedToken = parseJwt(data.accessToken);
      
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      
      // Also update the server-side cookie
      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.refreshToken }),
        credentials: 'include'
      });
      
      setAccessToken(parsedToken);
      return parsedToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear both client and server cookies
      deleteCookie('refreshToken');
      await fetch('/api/auth/clear-cookie', {
        method: 'POST',
        credentials: 'include'
      });
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Setup token refresh interval
  useEffect(() => {
    if (!accessToken) return;
  
    let refreshTimeout: NodeJS.Timeout | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;
  
    // Function to schedule the next refresh
    const scheduleRefresh = (delayMs: number) => {
      // Clear any existing timeout
      if (refreshTimeout) clearTimeout(refreshTimeout);
      
      refreshTimeout = setTimeout(async () => {
        try {
          // Attempt to refresh the token
          const newToken = await refreshTokens();
          if (newToken) {
            // If successful, schedule next refresh based on new token
            const nextRefreshTime = calculateTimeUntilRefresh(newToken);
            scheduleRefresh(nextRefreshTime);
          } else {
            // If refresh failed, try again with backoff
            scheduleRefresh(RETRY_INTERVAL);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh failed with error, try again with backoff
          scheduleRefresh(RETRY_INTERVAL);
        }
      }, delayMs);
    };
  
    // Calculate time until refresh with safeguards
    const calculateTimeUntilRefresh = (token: TokenData): number => {
      if (!token) return RETRY_INTERVAL;
      
      const timeUntil = token.expiresAt - Date.now() - REFRESH_THRESHOLD;
      // Return either the time until refresh or a minimum time
      return Math.max(timeUntil, MIN_REFRESH_INTERVAL);
    };
  
    // Constants for timing
    const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
    const MIN_REFRESH_INTERVAL = 60 * 1000;  // Minimum 1 minute
    const RETRY_INTERVAL = 30 * 1000;        // 30 seconds on failure
  
    // Initial scheduling
    const initialRefreshTime = calculateTimeUntilRefresh(accessToken);
    scheduleRefresh(initialRefreshTime);
  
    // Cleanup on unmount or when token changes
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (refreshInterval) clearInterval(refreshInterval);
    };
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
      console.log(`Sending login request to ${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      console.log('Login response status:', response.status);

      if (!response.ok) {
        throw data.error || new Error('Invalid credentials');
      }

      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      
      // Also set a server-readable cookie with fetch
      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.refreshToken }),
        credentials: 'include'
      });
      
      setAccessToken(parsedToken);
      setUser(data.user);
      
      // Increase delay to ensure cookies are properly set before redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
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
      console.log(`Sending signup request to ${API_BASE_URL}${API_ENDPOINTS.AUTH.SIGNUP}`);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.SIGNUP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      console.log('Signup response status:', response.status);
      
      if (!response.ok) {
        throw data.error || new Error('Signup failed');
      }

      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      // Store refresh token in cookie
      setCookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);
      
      // Also set a server-readable cookie with fetch
      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.refreshToken }),
        credentials: 'include'
      });
      
      setAccessToken(parsedToken);
      setUser(data.user);
      
      // Increase delay to ensure cookies are properly set before redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
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
        console.log(`Sending logout request to ${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`);
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include',
          mode: 'cors'
        });
      }
      
      // Clear the server-side cookie
      await fetch('/api/auth/clear-cookie', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove client-side cookie
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