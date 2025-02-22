// backend/src/services/search/databases/types.ts

import { SearchQuery, SearchResult } from '@thinkleap/shared/types/search';

export type AuthType = 'none' | 'apiKey' | 'oauth' | 'shibboleth';

export interface DatabaseFeatures {
  supportsPagination: boolean;
  supportsFullText: boolean;
  supportsCitationCounts: boolean;
  supportsAdvancedFilters: boolean;
}

export interface DatabaseConfig {
  id: string;
  name: string;
  enabled: boolean;
  authType: AuthType;
  features: DatabaseFeatures;
  baseUrl: string;
  auth?: {
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
  };
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit?: number;
  };
  timeout?: number;  // Request timeout in ms
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface SearchError extends Error {
  type: 'auth' | 'rate_limit' | 'timeout' | 'parse' | 'network' | 'unknown';
  retryable: boolean;
  source: string;
}