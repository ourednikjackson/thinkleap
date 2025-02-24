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
  
  export interface UpdatePreferencesDTO {
    path: string[];
    value: unknown;
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