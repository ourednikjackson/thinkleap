import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (storedRefreshToken) {
          const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
          });
          
          if (response.ok) {
            const data = await response.json();
            setAccessToken(data.accessToken);
            await fetchUserProfile(data.accessToken);
          } else {
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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
        throw data.error;
      }

      setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error: any) {
      setError(translateError(error));
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
        throw data.error;
      }

      setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error: any) {
      setError(translateError(error));
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, clearError }}>
      {error && (
        <Alert variant="destructive" className="fixed top-4 right-4 w-96">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {user && !user.emailVerified && (
        <Alert className="fixed bottom-4 right-4 w-96 bg-yellow-50">
          <AlertDescription>
            Please verify your email to access all features.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};