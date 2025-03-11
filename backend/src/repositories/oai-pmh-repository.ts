import { db } from '../db';
import { 
  OaiPmhSource, 
  OaiPmhSourceCreateParams, 
  OaiPmhSourceUpdateParams, 
  HarvestedMetadata, 
  HarvestLog 
} from '../models/oai-pmh';
import { logger } from '../utils/logger';

/**
 * Repository for OAI-PMH sources and harvested metadata
 */
export class OaiPmhRepository {
  /**
   * Create a new OAI-PMH source
   */
  async createSource(params: OaiPmhSourceCreateParams): Promise<OaiPmhSource> {
    try {
      const [source] = await db('oai_pmh_sources').insert({
        name: params.name,
        oai_endpoint: params.oai_endpoint,
        metadata_prefix: params.metadata_prefix || 'oai_dc',
        filter_providers: params.filter_providers || ['jstor'],
        harvest_frequency: params.harvest_frequency || '0 0 * * 0', // Weekly on Sunday at midnight
        status: params.status || 'active',
        settings: params.settings ? JSON.stringify(params.settings) : '{}',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      return source;
    } catch (error) {
      logger.error('Failed to create OAI-PMH source:', error);
      throw error;
    }
  }

  /**
   * Update an existing OAI-PMH source
   */
  async updateSource(id: string, params: OaiPmhSourceUpdateParams): Promise<OaiPmhSource> {
    try {
      const updateData: any = { updated_at: new Date() };
      
      if (params.name !== undefined) updateData.name = params.name;
      if (params.oai_endpoint !== undefined) updateData.oai_endpoint = params.oai_endpoint;
      if (params.metadata_prefix !== undefined) updateData.metadata_prefix = params.metadata_prefix;
      if (params.filter_providers !== undefined) updateData.filter_providers = params.filter_providers;
      if (params.harvest_frequency !== undefined) updateData.harvest_frequency = params.harvest_frequency;
      if (params.status !== undefined) updateData.status = params.status;
      if (params.settings !== undefined) updateData.settings = JSON.stringify(params.settings);
      
      const [source] = await db('oai_pmh_sources')
        .where({ id })
        .update(updateData)
        .returning('*');
      
      if (!source) {
        throw new Error(`Source not found: ${id}`);
      }
      
      return source;
    } catch (error) {
      logger.error(`Failed to update OAI-PMH source ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an OAI-PMH source
   */
  async deleteSource(id: string): Promise<void> {
    try {
      const deleted = await db('oai_pmh_sources')
        .where({ id })
        .delete();
      
      if (!deleted) {
        throw new Error(`Source not found: ${id}`);
      }
    } catch (error) {
      logger.error(`Failed to delete OAI-PMH source ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get an OAI-PMH source by ID
   */
  async getSourceById(id: string): Promise<OaiPmhSource | null> {
    try {
      const source = await db('oai_pmh_sources')
        .where({ id })
        .first();
      
      return source || null;
    } catch (error) {
      logger.error(`Failed to get OAI-PMH source ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all OAI-PMH sources
   */
  async getAllSources(): Promise<OaiPmhSource[]> {
    try {
      const sources = await db('oai_pmh_sources')
        .select()
        .orderBy('created_at', 'desc');
      
      return sources;
    } catch (error) {
      logger.error('Failed to get all OAI-PMH sources:', error);
      throw error;
    }
  }

  /**
   * Get sources with a specific status
   */
  async getSourcesByStatus(status: string): Promise<OaiPmhSource[]> {
    try {
      const sources = await db('oai_pmh_sources')
        .where({ status })
        .select()
        .orderBy('created_at', 'desc');
      
      return sources;
    } catch (error) {
      logger.error(`Failed to get OAI-PMH sources with status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Search for harvested metadata
   */
  async searchMetadata(
    provider: string,
    query: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {}
  ): Promise<{ results: HarvestedMetadata[], total: number }> {
    try {
      // Start building the query
      let dbQuery = db('harvested_metadata')
        .where({ provider })
        .whereRaw("to_tsvector('english', title || ' ' || COALESCE(abstract, '')) @@ plainto_tsquery('english', ?)", [query]);
      
      // Apply filters
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          dbQuery = dbQuery.where('publication_date', '>=', filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          dbQuery = dbQuery.where('publication_date', '<=', filters.dateRange.end);
        }
      }
      
      if (filters.authors && filters.authors.length > 0) {
        dbQuery = dbQuery.whereRaw(`authors @> ?`, [JSON.stringify(filters.authors.map(a => ({ name: a })))]);
      }
      
      if (filters.journals && filters.journals.length > 0) {
        dbQuery = dbQuery.whereIn('journal', filters.journals);
      }
      
      if (filters.keywords && filters.keywords.length > 0) {
        const keywordConditions = filters.keywords.map(() => 'keywords @> ?');
        const keywordValues = filters.keywords.map(k => `{${k}}`);
        
        dbQuery = dbQuery.whereRaw(`(${keywordConditions.join(' OR ')})`, keywordValues);
      }
      
      // Get total count
      const countQuery = dbQuery.clone().count('* as total').first();
      
      // Get paginated results
      const resultsQuery = dbQuery
        .select()
        .orderBy('publication_date', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);
      
      // Execute both queries
      const [countResult, results] = await Promise.all([countQuery, resultsQuery]);
      
      return {
        results,
        total: parseInt(countResult?.total || '0')
      };
    } catch (error) {
      logger.error(`Failed to search harvested metadata for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get harvest logs for a source
   */
  async getHarvestLogs(sourceId: string, limit: number = 10): Promise<HarvestLog[]> {
    try {
      const logs = await db('harvest_logs')
        .where({ source_id: sourceId })
        .select()
        .orderBy('started_at', 'desc')
        .limit(limit);
      
      return logs;
    } catch (error) {
      logger.error(`Failed to get harvest logs for source ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get metadata statistics
   */
  async getMetadataStats(): Promise<any> {
    try {
      // Get counts by provider
      const providerCounts = await db('harvested_metadata')
        .select('provider')
        .count('* as count')
        .groupBy('provider');
      
      // Get total count
      const totalCount = await db('harvested_metadata')
        .count('* as count')
        .first();
      
      // Get counts by source
      const sourceCounts = await db('harvested_metadata')
        .select('source_id')
        .count('* as count')
        .groupBy('source_id');
      
      // Get counts by month
      const monthlyCounts = await db.raw(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count 
        FROM harvested_metadata 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 12
      `);
      
      return {
        total: parseInt(totalCount?.count || '0'),
        byProvider: providerCounts,
        bySource: sourceCounts,
        byMonth: monthlyCounts.rows
      };
    } catch (error) {
      logger.error('Failed to get metadata statistics:', error);
      throw error;
    }
  }
}
