// backend/src/services/search/search-cache.service.ts
import { createHash } from 'crypto';
import { SearchQuery, SearchResult } from '@thinkleap/shared/types/search';
import { CacheService } from '../../services/cache';
import { Logger } from '../../services/logger';

export interface CachedSearchResult {
  results: SearchResult[];
  timestamp: number;
  query: SearchQuery;
  databases: string[];
}

export class SearchCacheService {
  private readonly PREFIX = 'search:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: Logger
  ) {}

  /**
   * Generate a deterministic cache key for a search query
   */
  private generateCacheKey(query: SearchQuery, databases: string[]): string {
    const normalizedQuery = {
      term: query.term.toLowerCase().trim(),
      filters: query.filters || {},
      pagination: {
        page: 1, // Always cache first page
        limit: query.pagination.limit
      }
    };

    const sortedDatabases = [...databases].sort();
    
    const data = JSON.stringify({
      query: normalizedQuery,
      databases: sortedDatabases
    });

    const hash = createHash('sha256').update(data).digest('hex');
    return `${this.PREFIX}${hash}`;
  }

  /**
   * Check if cached results should be considered valid
   */
  private isValid(cached: CachedSearchResult): boolean {
    const age = Date.now() - cached.timestamp;
    return age < this.DEFAULT_TTL * 1000;
  }

  /**
   * Try to get cached search results
   */
  async getCachedResults(
    query: SearchQuery,
    databases: string[]
  ): Promise<SearchResult[] | null> {
    try {
      const cacheKey = this.generateCacheKey(query, databases);
      const cached = await this.cacheService.get<CachedSearchResult>(cacheKey);

      if (!cached) {
        return null;
      }

      if (!this.isValid(cached)) {
        await this.cacheService.delete(cacheKey);
        return null;
      }

      this.logger.debug('Cache hit for search query', {
        term: query.term,
        databases
      });

      return cached.results;
    } catch (error) {
      this.logger.error('Error retrieving cached search results', error as Error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async cacheResults(
    query: SearchQuery,
    databases: string[],
    results: SearchResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query, databases);
      const cached: CachedSearchResult = {
        results,
        timestamp: Date.now(),
        query,
        databases
      };

      await this.cacheService.set(cacheKey, cached, {
        ttl: this.DEFAULT_TTL
      });

      this.logger.debug('Cached search results', {
        term: query.term,
        databases,
        resultCount: results.length
      });
    } catch (error) {
      this.logger.error('Error caching search results', error as Error);
    }
  }

  /**
   * Invalidate cached results for specific databases
   */
  async invalidateForDatabases(databases: string[]): Promise<void> {
    // Note: This is a placeholder. In a real implementation,
    // we would need a way to track keys by database
    this.logger.info('Cache invalidation requested for databases', {
      databases
    });
  }

  /**
   * Clear all cached search results
   */
  async clearAll(): Promise<void> {
    // Note: This is a placeholder. In a real implementation,
    // we would need a way to get all search cache keys
    this.logger.info('Full search cache clear requested');
  }
}