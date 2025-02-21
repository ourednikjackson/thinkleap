// src/lib/auth/types.ts
export interface User {
    id: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
  }
  
  export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
  }