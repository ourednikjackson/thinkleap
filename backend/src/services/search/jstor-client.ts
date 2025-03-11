import { db } from '../../db';
import { logger } from '../../utils/logger';

interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  filters?: {
    author?: string;
    journal?: string;
    keywords?: string[];
  };
}

interface SearchResult {
  id: string;
  title: string;
  authors: Array<{ name: string, identifier?: string }>;
  abstract?: string;
  publication_date?: Date;
  journal?: string;
  url?: string;
  doi?: string;
  keywords?: string[];
  provider: string;
  score?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

/**
 * Client for searching harvested JSTOR metadata
 */
export class JstorSearchClient {
  /**
   * Search harvested JSTOR metadata
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    try {
      const {
        query,
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc',
        dateRange,
        filters
      } = options;

      // Start building the query
      let searchQuery = db('harvested_metadata')
        .where({ provider: 'jstor' });

      // Full-text search on title and abstract
      if (query) {
        searchQuery = searchQuery
          .whereRaw(`
            to_tsvector('english', title) @@ plainto_tsquery('english', ?)
            OR to_tsvector('english', COALESCE(abstract, '')) @@ plainto_tsquery('english', ?)
          `, [query, query]);
      }

      // Apply date range filters
      if (dateRange) {
        if (dateRange.from) {
          searchQuery = searchQuery.where('publication_date', '>=', dateRange.from);
        }
        if (dateRange.to) {
          searchQuery = searchQuery.where('publication_date', '<=', dateRange.to);
        }
      }

      // Apply additional filters
      if (filters) {
        if (filters.author) {
          searchQuery = searchQuery.whereRaw(`
            EXISTS (
              SELECT 1
              FROM jsonb_array_elements(authors) AS author
              WHERE author->>'name' ILIKE ?
            )
          `, [`%${filters.author}%`]);
        }

        if (filters.journal) {
          searchQuery = searchQuery.whereRaw(`journal ILIKE ?`, [`%${filters.journal}%`]);
        }

        if (filters.keywords && filters.keywords.length > 0) {
          filters.keywords.forEach(keyword => {
            searchQuery = searchQuery.whereRaw(`? = ANY(keywords)`, [keyword]);
          });
        }
      }

      // Count total records matching the query
      const countResult = await searchQuery.clone().count('* as total').first();
      const total = parseInt(countResult.total as string, 10);

      // Apply sorting
      if (sortBy === 'relevance' && query) {
        // Sort by relevance (text search rank)
        searchQuery = searchQuery.orderByRaw(`
          ts_rank(to_tsvector('english', title), plainto_tsquery('english', ?)) ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
          ts_rank(to_tsvector('english', COALESCE(abstract, '')), plainto_tsquery('english', ?)) ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        `, [query, query]);
      } else if (sortBy === 'date') {
        // Sort by publication date
        searchQuery = searchQuery.orderBy('publication_date', sortOrder);
      } else {
        // Default sort by title
        searchQuery = searchQuery.orderBy('title', sortOrder);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      searchQuery = searchQuery.offset(offset).limit(limit);

      // Execute the query
      const results = await searchQuery.select([
        'id',
        'title',
        'authors',
        'abstract',
        'publication_date',
        'journal',
        'url',
        'doi',
        'keywords',
        'provider'
      ]);

      // Parse JSON fields
      const parsedResults = results.map(result => ({
        ...result,
        authors: typeof result.authors === 'string'
          ? JSON.parse(result.authors)
          : result.authors
      }));

      // Add relevance score if sorting by relevance
      if (sortBy === 'relevance' && query) {
        parsedResults.forEach((result, index) => {
          result.score = 1 - (index / parsedResults.length);
        });
      }

      return {
        results: parsedResults,
        total,
        page,
        limit,
        query
      };
    } catch (error) {
      logger.error('Error searching JSTOR metadata:', error);
      throw new Error(`Failed to search JSTOR: ${error.message}`);
    }
  }

  /**
   * Get a specific article by ID
   */
  async getById(id: string): Promise<SearchResult | null> {
    try {
      const result = await db('harvested_metadata')
        .where({
          id,
          provider: 'jstor'
        })
        .first();

      if (!result) {
        return null;
      }

      // Parse JSON fields
      return {
        ...result,
        authors: typeof result.authors === 'string'
          ? JSON.parse(result.authors)
          : result.authors
      };
    } catch (error) {
      logger.error(`Error fetching JSTOR article by ID ${id}:`, error);
      throw new Error(`Failed to fetch JSTOR article: ${error.message}`);
    }
  }

  /**
   * Get recommendations for similar articles
   */
  async getSimilar(id: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Get the source article
      const sourceArticle = await this.getById(id);
      if (!sourceArticle) {
        return [];
      }

      // Find similar articles based on title and abstract similarity
      const results = await db('harvested_metadata')
        .where({ provider: 'jstor' })
        .whereNot({ id })
        .whereRaw(`
          to_tsvector('english', title) @@ plainto_tsquery('english', ?)
          OR to_tsvector('english', COALESCE(abstract, '')) @@ plainto_tsquery('english', ?)
        `, [sourceArticle.title, sourceArticle.abstract || ''])
        .orderByRaw(`
          ts_rank(to_tsvector('english', title), plainto_tsquery('english', ?)) +
          ts_rank(to_tsvector('english', COALESCE(abstract, '')), plainto_tsquery('english', ?)) DESC
        `, [sourceArticle.title, sourceArticle.abstract || ''])
        .limit(limit)
        .select([
          'id',
          'title',
          'authors',
          'abstract',
          'publication_date',
          'journal',
          'url',
          'doi',
          'keywords',
          'provider'
        ]);

      // Parse JSON fields
      return results.map(result => ({
        ...result,
        authors: typeof result.authors === 'string'
          ? JSON.parse(result.authors)
          : result.authors
      }));
    } catch (error) {
      logger.error(`Error finding similar JSTOR articles for ID ${id}:`, error);
      throw new Error(`Failed to find similar articles: ${error.message}`);
    }
  }
}

// Export singleton instance
export const jstorClient = new JstorSearchClient();
