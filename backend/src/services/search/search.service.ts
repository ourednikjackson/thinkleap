// backend/src/services/search/search.service.ts
import { Logger } from '../../services/logger';
import { CacheService } from '../../services/cache';
import { SearchQuery, SearchResult, SearchResponse } from '@thinkleap/shared/types/search';
import { DatabaseRegistry } from '../search/databases/registry';
import { SearchError } from './databases/types';
import { PubMedConnector } from './databases/pubmed/connector';
import { SearchCacheService } from './search.cache.service';



export class SearchService {
  private readonly registry: DatabaseRegistry;

  constructor(
    private readonly logger: Logger,
    private readonly cacheService: CacheService,
    private readonly searchCache: SearchCacheService,
    private readonly config: Record<string, any>
  ) {
    this.registry = new DatabaseRegistry();
    this.initializeDatabases();
  }

  private paginateResults(results: SearchResult[], pagination: { page: number; limit: number }): SearchResult[] {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return results.slice(startIndex, endIndex);
  }

  private initializeDatabases(): void {
    // Initialize PubMed connector
    const pubmedConfig = {
      id: 'pubmed',
      name: 'PubMed',
      enabled: true,
      authType: 'apiKey' as const,
      baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      features: {
        supportsPagination: true,
        supportsFullText: false,
        supportsCitationCounts: false,
        supportsAdvancedFilters: true
      },
      auth: {
        apiKey: this.config.PUBMED_API_KEY
      },
      rateLimit: {
        requestsPerSecond: 3
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000
      }
    };

    const pubmedConnector = new PubMedConnector(
      pubmedConfig,
      this.logger,
      this.cacheService
    );

    this.registry.registerDatabase('pubmed', pubmedConnector);
  }

  async search(
    userId: string,
    query: SearchQuery,
    databases?: string[]
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Get enabled databases
      const enabledDatabases = await this.registry.getEnabledDatabases(userId);
      const databasesToSearch = databases
        ? enabledDatabases.filter(db => databases.includes(db.name))
        : enabledDatabases;

      if (!databasesToSearch.length) {
        throw new Error('No enabled databases available for search');
      }

       // Check cache first
       if (query.pagination.page === 1) {
        const cachedResults = await this.searchCache.getCachedResults(
          query,
          databasesToSearch.map(db => db.name)
        );

        if (cachedResults) {
            return {
              results: this.paginateResults(cachedResults, query.pagination),
              totalResults: cachedResults.length,
              page: query.pagination.page,
              totalPages: Math.ceil(cachedResults.length / query.pagination.limit),
              executionTimeMs: Date.now() - startTime,
              databasesSearched: databasesToSearch.map(db => db.name),
              errors: []
            };
          }
      }

      // Execute searches in parallel
      interface DatabaseSearchResult {
        source: string;
        results: SearchResult[];
        error: SearchError | null;
      }

      // Execute searches in parallel
      const searchPromises = databasesToSearch.map(async database => {
        try {
          const results = await database.search(query);
          return {
            source: database.name,
            results,
            error: null
          };
        } catch (error) {
          this.logger.error(
            `Search failed for database ${database.name}`,
            error as Error
          );
          return {
            source: database.name,
            results: [],
            error: error as SearchError
          };
        }
      });

      const searchResults = await Promise.all(searchPromises);

      // Aggregate results
      const allResults: SearchResult[] = [];
      const errors: Array<{ source: string; error: SearchError }> = [];

      searchResults.forEach(result => {
        if (result.error) {
          errors.push({
            source: result.source,
            error: result.error
          });
        } else {
          allResults.push(...result.results);
        }
      });

      // Sort results by date (newest first)
      allResults.sort((a, b) => {
        const dateA = a.publicationDate?.getTime() || 0;
        const dateB = b.publicationDate?.getTime() || 0;
        return dateB - dateA;
      });

      // Apply pagination
      const startIndex = (query.pagination.page - 1) * query.pagination.limit;
      const endIndex = startIndex + query.pagination.limit;
      const paginatedResults = allResults.slice(startIndex, endIndex);

      const response: SearchResponse = {
        results: paginatedResults,
        totalResults: allResults.length,
        page: query.pagination.page,
        totalPages: Math.ceil(allResults.length / query.pagination.limit),
        executionTimeMs: Date.now() - startTime,
        databasesSearched: databasesToSearch.map(db => db.name),
        errors: errors.length > 0 ? errors : undefined
      };

      return response;
    } catch (error) {
      this.logger.error('Search operation failed', error as Error);
      throw error;
    }
  }
}