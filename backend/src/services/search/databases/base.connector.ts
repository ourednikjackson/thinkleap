// backend/src/services/search/databases/base.connector.ts

import { Logger } from '../../../services/logger';
import { CacheService } from '../../../services/cache';
import { SearchQuery, SearchResult } from '@thinkleap/shared/types/search';
import { DatabaseConfig, SearchError } from './types';

export abstract class BaseDatabaseConnector {
  protected constructor(
    protected readonly config: DatabaseConfig,
    protected readonly logger: Logger,
    protected readonly cacheService: CacheService
  ) {}

  abstract get name(): string;

  /**
   * Perform a search against the database
   */
  abstract search(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Check if this database connector is enabled and available
   */
  async isEnabled(): Promise<boolean> {
    return this.config.enabled;
  }

  /**
   * Validate whether a specific user has access to this database
   */
  abstract validateAccess(userId: string): Promise<boolean>;

  /**
   * Perform any necessary authentication steps
   */
  abstract authenticate(): Promise<void>;

  /**
   * Transform database-specific errors into standardized SearchError format
   */
  protected abstract transformError(error: unknown): SearchError;

  /**
   * Generate a cache key for a specific search query
   */
  protected generateCacheKey(query: SearchQuery): string {
    const normalized = {
      term: query.term.toLowerCase(),
      filters: query.filters || {},
      pagination: query.pagination
    };
    return `${this.config.id}:search:${JSON.stringify(normalized)}`;
  }

  /**
   * Implement exponential backoff retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const searchError = this.transformError(error);
      
      if (
        !searchError.retryable ||
        !this.config.retryConfig ||
        retryCount >= this.config.retryConfig.maxRetries
      ) {
        throw searchError;
      }

      const backoffMs = this.config.retryConfig.backoffMs * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      return this.withRetry(operation, retryCount + 1);
    }
  }
}