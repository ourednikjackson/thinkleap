import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache';
import { LoggerService } from '../logger/logger.service';
import { MetadataSearchResult } from '../../../shared/types/metadata';

export interface MetadataSearchOptions {
  query: string;
  page: number;
  limit: number;
  institutionId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  providers?: string[];
  openAccessOnly?: boolean;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface MetadataSearchResponse {
  results: MetadataSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MetadataSearchService {
  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private cacheService: CacheService
  ) {}
  
  /**
   * Get metadata record by ID
   */
  async metadataById(id: string): Promise<MetadataSearchResult | null> {
    try {
      const record = await this.databaseService.knex('metadata_records')
        .where('id', id)
        .first();
      
      if (!record) {
        return null;
      }
      
      return {
        ...record,
        authors: record.authors ? JSON.parse(record.authors) : [],
        additionalMetadata: record.additional_metadata ? JSON.parse(record.additional_metadata) : {},
        hasAccess: true, // Access was already checked before calling this method
        accessUrl: record.url,
        source: record.provider
      };
    } catch (error) {
      this.logger.error('Error getting metadata record by ID', { error, id });
      return null;
    }
  }
  
  /**
   * Get all available providers, optionally filtered by institution's subscriptions
   */
  async getProviders(institutionId?: string): Promise<string[]> {
    try {
      // Cache key
      const cacheKey = `metadata:providers:${institutionId || 'all'}`;
      
      // Check cache first
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      
      let query = this.databaseService.knex('metadata_records')
        .distinct('provider');
      
      // If institution ID is provided, filter by subscriptions
      if (institutionId) {
        const subscriptions = await this.databaseService.knex('institutional_subscriptions')
          .where('institution_id', institutionId)
          .where('active', true)
          .select('provider');
        
        const subscribedProviders = subscriptions.map(s => s.provider);
        
        // Include either open access or subscribed content
        query = query.where(function() {
          this.where('is_open_access', true)
            .orWhereIn('provider', subscribedProviders);
        });
      }
      
      const result = await query;
      const providers = result.map(r => r.provider);
      
      // Cache for 1 hour
      await this.cacheService.set(cacheKey, JSON.stringify(providers), 60 * 60);
      
      return providers;
    } catch (error) {
      this.logger.error('Error getting providers', { error, institutionId });
      return [];
    }
  }

  /**
   * Search metadata records with institutional access control
   */
  async search(options: MetadataSearchOptions): Promise<MetadataSearchResponse> {
    try {
      const {
        query,
        page = 1,
        limit = 20,
        institutionId,
        dateRange,
        providers,
        openAccessOnly = false,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      // Cache key for this search query
      const cacheKey = `metadata:search:${JSON.stringify({
        query,
        page,
        limit,
        institutionId,
        dateRange,
        providers,
        openAccessOnly,
        sortBy,
        sortOrder
      })}`;

      // Check cache first
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Start building query
      let baseQuery = this.databaseService.knex('metadata_records')
        .select(
          'metadata_records.*'
        );

      // Add text search
      if (query && query.trim() !== '') {
        const searchTerms = `%${query.trim().toLowerCase()}%`;
        baseQuery = baseQuery.where(function() {
          this.whereRaw('LOWER(title) LIKE ?', [searchTerms])
            .orWhereRaw('LOWER(abstract) LIKE ?', [searchTerms])
            .orWhereRaw('LOWER(keywords) LIKE ?', [searchTerms]);
        });
      }

      // Filter by institution if provided
      if (institutionId) {
        baseQuery = baseQuery.where('institution_id', institutionId);
      }

      // Filter by date range
      if (dateRange) {
        if (dateRange.from) {
          baseQuery = baseQuery.where('publication_date', '>=', dateRange.from);
        }
        if (dateRange.to) {
          baseQuery = baseQuery.where('publication_date', '<=', dateRange.to);
        }
      }

      // Filter by providers
      if (providers && providers.length > 0) {
        baseQuery = baseQuery.whereIn('provider', providers);
      }

      // Filter by open access
      if (openAccessOnly) {
        baseQuery = baseQuery.where('is_open_access', true);
      }

      // Get total count for pagination
      const countResult = await baseQuery.clone().count('* as total').first();
      const total = parseInt(countResult?.total as string, 10) || 0;
      const totalPages = Math.ceil(total / limit);

      // Add sorting
      switch (sortBy) {
        case 'date':
          baseQuery = baseQuery.orderBy('publication_date', sortOrder);
          break;
        case 'title':
          baseQuery = baseQuery.orderBy('title', sortOrder);
          break;
        case 'relevance':
        default:
          if (query && query.trim() !== '') {
            // Use PostgreSQL similarity function for relevance sorting
            baseQuery = baseQuery.orderByRaw(`similarity(title, ?) ${sortOrder}`, [query.trim()]);
          } else {
            // Default to date sorting if no query for relevance
            baseQuery = baseQuery.orderBy('publication_date', sortOrder);
          }
      }

      // Add pagination
      const offset = (page - 1) * limit;
      baseQuery = baseQuery.offset(offset).limit(limit);

      // Execute the query
      const records = await baseQuery;

      // Get institution subscriptions if institutionId provided
      const subscriptions = institutionId
        ? await this.databaseService.knex('institutional_subscriptions')
            .where('institution_id', institutionId)
            .where('active', true)
            .select('provider')
        : [];

      const subscribedProviders = new Set(subscriptions.map(s => s.provider));

      // Transform records with access information
      const results = records.map(record => {
        const hasAccess = record.is_open_access || subscribedProviders.has(record.provider);
        
        return {
          ...record,
          authors: record.authors ? JSON.parse(record.authors) : [],
          additionalMetadata: record.additional_metadata ? JSON.parse(record.additional_metadata) : {},
          hasAccess,
          accessUrl: hasAccess ? record.url : undefined,
          source: record.provider
        };
      });

      const response: MetadataSearchResponse = {
        results,
        total,
        page,
        limit,
        totalPages
      };

      // Cache the results for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(response), 300);

      return response;
    } catch (error) {
      this.logger.error('Error searching metadata', { error, options });
      throw error;
    }
  }

  /**
   * Log user access to a metadata record
   */
  async logAccess(
    userId: string,
    metadataRecordId: string,
    accessType: 'view' | 'download' | 'citation' | 'link',
    institutionId?: string
  ): Promise<void> {
    try {
      await this.databaseService.knex('user_access_logs').insert({
        id: uuidv4(),
        user_id: userId,
        metadata_record_id: metadataRecordId,
        institution_id: institutionId,
        access_type: accessType,
        accessed_at: new Date()
      });
    } catch (error) {
      this.logger.error('Error logging user access', { 
        error, 
        userId, 
        metadataRecordId, 
        accessType 
      });
    }
  }

  /**
   * Check if user has access to a specific metadata record
   */
  async checkAccess(userId: string, metadataRecordId: string): Promise<boolean> {
    try {
      // Get the record
      const record = await this.databaseService.knex('metadata_records')
        .where('id', metadataRecordId)
        .first();
      
      if (!record) {
        return false;
      }
      
      // If open access, anyone can access
      if (record.is_open_access) {
        return true;
      }
      
      // Get user's institutions
      const userInstitutions = await this.databaseService.knex('user_institutions')
        .where('user_id', userId)
        .select('institution_id');
      
      const institutionIds = userInstitutions.map(ui => ui.institution_id);
      
      // If the record belongs to one of user's institutions, they can access
      if (institutionIds.includes(record.institution_id)) {
        return true;
      }
      
      // Check if any of user's institutions have subscription to the provider
      const subscriptions = await this.databaseService.knex('institutional_subscriptions')
        .whereIn('institution_id', institutionIds)
        .where('provider', record.provider)
        .where('active', true)
        .first();
      
      return !!subscriptions;
    } catch (error) {
      this.logger.error('Error checking access', { error, userId, metadataRecordId });
      return false;
    }
  }
}