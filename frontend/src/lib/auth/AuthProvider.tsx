// src/lib/auth/AuthProvider.tsx
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './context';
import { User } from './types';

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
    const storedRefreshToken = localStorage.getItem('refreshToken');
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

      setAccessToken(parsedToken);
      return parsedToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      localStorage.removeItem('refreshToken');
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

      if (!response.ok) throw new Error('Invalid credentials');

      const data: TokenResponse & { user: User } = await response.json();
      
      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(parsedToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      setError('Invalid email or password');
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

      if (!response.ok) throw new Error('Signup failed');

      const data: TokenResponse & { user: User } = await response.json();
      
      const parsedToken = parseJwt(data.accessToken);
      if (!parsedToken) throw new Error('Invalid token received');

      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(parsedToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      setError('Error creating account');
      setUser(null);
      setAccessToken(null);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
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
      localStorage.removeItem('refreshToken');
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