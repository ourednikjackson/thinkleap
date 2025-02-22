// shared/types/search.ts

export interface DateRange {
    start?: Date;
    end?: Date;
  }
  
  export interface SearchFilters {
    dateRange?: DateRange;
    authors?: string[];
    journals?: string[];
    articleTypes?: string[];
    languages?: string[];
  }
  
  export interface SearchQuery {
    term: string;
    filters?: SearchFilters;
    pagination: {
      page: number;
      limit: number;
    };
  }
  
  export interface Author {
    name: string;
    affiliation?: string;
    identifier?: string;  // For ORCID or other IDs
  }
  
  export interface Journal {
    name: string;
    volume?: string;
    issue?: string;
    pages?: string;
    identifier?: string;  // For ISSN or other IDs
  }
  
  export interface SearchResult {
    id: string;
    databaseId: string;  // Which database this result came from
    title: string;
    authors: Author[];
    abstract?: string;
    publicationDate?: Date;
    journal?: Journal;
    doi?: string;
    keywords?: string[];
    articleType?: string;
    language?: string;
    fullTextUrl?: string;
    citationCount?: number;
    metadata: Record<string, unknown>;  // Database-specific additional data
  }

  
export interface SearchError {
  source: string;
  type: 'auth' | 'rate_limit' | 'timeout' | 'parse' | 'network' | 'unknown';
  message: string;
  retryable: boolean;
  name?: string;
}
  
export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  executionTimeMs: number;
  databasesSearched: string[];
  errors?: Array<{ source: string; error: SearchError }>;
}