export interface SavedSearch {
    id: string;
    userId: string;
    name: string;
    description?: string;
    query: string;
    filters: Record<string, any>;
    lastExecutedAt?: Date;
    executionCount: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface SavedSearchExecution {
    id: string;
    savedSearchId: string;
    resultsCount: number;
    executionTimeMs: number;
    executedAt: Date;
  }
  
  export interface CreateSavedSearchDTO {
    name: string;
    description?: string;
    query: string;
    filters: Record<string, any>;
  }
  
  export interface UpdateSavedSearchDTO {
    name?: string;
    description?: string;
    filters?: Record<string, any>;
  }
  
  export interface SavedSearchQueryOptions {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'lastExecutedAt' | 'executionCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }