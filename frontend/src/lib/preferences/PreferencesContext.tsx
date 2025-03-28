'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
// Define preferences types locally since the shared package import is failing
export interface UserPreferences {
  search: {
    resultsPerPage: number;
    defaultSortOrder: 'relevance' | 'date' | 'citations';
    defaultFilters?: {
      dateRange?: 'all' | 'year' | 'month' | 'week';
      documentTypes?: string[];
      languages?: string[];
    };
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    density: 'comfortable' | 'compact';
  };
  notifications: {
    emailAlerts: boolean;
    searchUpdates: boolean;
    newFeatures: boolean;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  search: {
    resultsPerPage: 10,
    defaultSortOrder: 'relevance',
    defaultFilters: {
      dateRange: 'all',
      documentTypes: [],
      languages: ['en']
    }
  },
  display: {
    theme: 'system',
    density: 'comfortable'
  },
  notifications: {
    emailAlerts: true,
    searchUpdates: true,
    newFeatures: true
  }
};
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: (path: string[], value: unknown) => Promise<void>;
  resetPreferences: () => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/preferences');
      if (!response.ok) throw new Error('Failed to load preferences');
      const data = await response.json();
      setPreferences(data.data);
    } catch (error) {
      toast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [])
  
  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user, loadPreferences]);

  

  const updatePreference = async (path: string[], value: unknown) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, value }),
      });
      
      if (!response.ok) throw new Error('Failed to update preference');
      
      const data = await response.json();
      setPreferences(data.data);
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
      throw error;
    }
  };

  const resetPreferences = async () => {
    try {
      const response = await fetch('/api/preferences/reset', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to reset preferences');
      
      const data = await response.json();
      setPreferences(data.data);
      toast.success('Preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset preferences');
      throw error;
    }
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreference, resetPreferences, isLoading }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};