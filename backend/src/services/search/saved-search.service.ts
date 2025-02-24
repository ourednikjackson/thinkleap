// backend/src/services/search/saved-search.service.ts
import { DatabaseService } from '../database/database.service';
import { SearchService } from './search.service';
import { Logger } from '../logger';
import { AuditLogService } from '../audit/audit-log.service';
import {
  SavedSearch,
  SavedSearchExecution,
  CreateSavedSearchDTO,
  UpdateSavedSearchDTO,
  SavedSearchQueryOptions
} from '@thinkleap/shared/types/saved-search';
import { SearchResponse } from '@thinkleap/shared/types/search';

export class SavedSearchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly searchService: SearchService,
    private readonly logger: Logger,
    private readonly auditLogService: AuditLogService
  ) {}

  async create(userId: string, data: CreateSavedSearchDTO): Promise<SavedSearch> {
    try {
      const result = await this.databaseService.query(
        `INSERT INTO saved_searches (
          user_id, name, description, query, filters
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, data.name, data.description, data.query, JSON.stringify(data.filters)]
      );

      await this.auditLogService.log({
        userId,
        action: 'SAVED_SEARCH_CREATED',
        details: { searchId: result.rows[0].id, name: data.name }
      });

      return this.mapSavedSearch(result.rows[0]);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to create saved search', error, { userId, data });
      throw error;
    }
  }

  async findById(id: string, userId: string): Promise<SavedSearch | null> {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM saved_searches WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return result.rows[0] ? this.mapSavedSearch(result.rows[0]) : null;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to find saved search', error, { id, userId });
      throw error;
    }
  }

  private readonly columnMapping = {
    name: 'name',
    lastExecutedAt: 'last_executed_at',
    executionCount: 'execution_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    userId: 'user_id',
    query: 'query',
    filters: 'filters',
    description: 'description'
  } as const;
  
  private readonly allowedSortColumns = new Set([
    'name',
    'last_executed_at',
    'execution_count',
    'created_at'
  ]);

  private getSortColumn(sortBy: SavedSearchQueryOptions['sortBy']): string {
    const columnName = this.columnMapping[sortBy || 'createdAt'];
    if (!this.allowedSortColumns.has(columnName)) {
      throw new Error(`Invalid sort column: ${sortBy}`);
    }
    return columnName;
  }

  async findByUser(
    userId: string,
    options: SavedSearchQueryOptions = {}
  ): Promise<{ searches: SavedSearch[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;
  
      const offset = (page - 1) * limit;
      const sortColumn = this.getSortColumn(sortBy);
  
      // Validate sort order to prevent SQL injection
      if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
        throw new Error('Invalid sort order');
      }
  
      const countResult = await this.databaseService.query(
        'SELECT COUNT(*) FROM saved_searches WHERE user_id = $1',
        [userId]
      );
  
      const query = `
        SELECT 
          id,
          user_id,
          name,
          description,
          query,
          filters,
          last_executed_at,
          execution_count,
          created_at,
          updated_at
        FROM saved_searches 
        WHERE user_id = $1 
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $2 OFFSET $3
      `;
  
      const result = await this.databaseService.query(query, [
        userId,
        limit,
        offset
      ]);
  
      return {
        searches: result.rows.map(this.mapSavedSearch),
        total: parseInt(countResult.rows[0].count)
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to find user saved searches', error, { userId, options });
      throw error;
    }
  }

  async update(
    id: string,
    userId: string,
    data: UpdateSavedSearchDTO
  ): Promise<SavedSearch> {
    try {
      const updates: string[] = [];
      const values: any[] = [id, userId];
      let paramCount = 3;

      if (data.name) {
        updates.push(`name = $${paramCount}`);
        values.push(data.name);
        paramCount++;
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(data.description);
        paramCount++;
      }

      if (data.filters) {
        updates.push(`filters = $${paramCount}`);
        values.push(JSON.stringify(data.filters));
        paramCount++;
      }

      const result = await this.databaseService.query(
        `UPDATE saved_searches 
         SET ${updates.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        throw new Error('Saved search not found');
      }

      await this.auditLogService.log({
        userId,
        action: 'SAVED_SEARCH_UPDATED',
        details: { searchId: id }
      });

      return this.mapSavedSearch(result.rows[0]);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to update saved search', error, { id, userId, data });
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const result = await this.databaseService.query(
        'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Saved search not found');
      }

      await this.auditLogService.log({
        userId,
        action: 'SAVED_SEARCH_DELETED',
        details: { searchId: id }
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to delete saved search', error, { id, userId });
      throw error;
    }
  }

  async execute(id: string, userId: string): Promise<SearchResponse> {
    try {
      const savedSearch = await this.findById(id, userId);
      if (!savedSearch) {
        throw new Error('Saved search not found');
      }

      const startTime = Date.now();
      const response = await this.searchService.search(
        userId,
        {
          term: savedSearch.query,
          filters: savedSearch.filters,
          pagination: { page: 1, limit: 10 }
        }
      );

      // Record execution
      await this.databaseService.query(
        `INSERT INTO saved_search_executions (
          saved_search_id, results_count, execution_time_ms
        ) VALUES ($1, $2, $3)`,
        [id, response.totalResults, Date.now() - startTime]
      );

      await this.auditLogService.log({
        userId,
        action: 'SAVED_SEARCH_EXECUTED',
        details: {
          searchId: id,
          resultsCount: response.totalResults,
          executionTimeMs: Date.now() - startTime
        }
      });

      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to execute saved search', error, { id, userId });
      throw error;
    }
  }

  private mapSavedSearch(row: any): SavedSearch {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      query: row.query,
      filters: row.filters,
      lastExecutedAt: row.last_executed_at,
      executionCount: row.execution_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}