// OAI-PMH search client
import { db } from '../../../lib/db';
import { logger } from '../../../lib/logger';
import { 
  SearchParams, 
  SearchResult, 
  SearchResultItem 
} from '@thinkleap/shared/types/search';

interface OaiPmhSearchOptions extends SearchParams {
  sourceId?: string;
}

/**
 * Search harvested OAI-PMH metadata
 */
export async function searchOaiPmh(options: OaiPmhSearchOptions): Promise<{ data: SearchResult }> {
  const startTime = Date.now();
  
  try {
    // Normalize options
    const query = options.query;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const sourceId = options.sourceId;
    
    logger.info(`OAI-PMH search: "${query}" (page ${page}, limit ${limit}${sourceId ? `, sourceId: ${sourceId}` : ''})`);
    
    // Build base query
    let dbQuery = db('harvested_metadata')
      .select([
        'id',
        'provider',
        'record_id',
        'title',
        'authors',
        'abstract',
        'publication_date as publicationDate',
        'journal',
        'url',
        'doi',
        'keywords',
        'source_id as sourceId'
      ]);
    
    // Apply text search if query is provided
    if (query && query.trim()) {
      dbQuery = dbQuery.whereRaw(
        `to_tsvector('english', title || ' ' || COALESCE(abstract, '')) @@ plainto_tsquery('english', ?)`,
        [query.trim()]
      );
    }
    
    // Filter by source if provided
    if (sourceId) {
      dbQuery = dbQuery.where('source_id', sourceId);
    }
    
    // Apply date filters if provided
    if (options.filters?.dateRange?.start) {
      dbQuery = dbQuery.where('publication_date', '>=', options.filters.dateRange.start);
    }
    
    if (options.filters?.dateRange?.end) {
      dbQuery = dbQuery.where('publication_date', '<=', options.filters.dateRange.end);
    }
    
    // Get total count
    const countQuery = dbQuery.clone().count('* as count').first();
    
    // Apply pagination to results query
    dbQuery = dbQuery
      .orderBy('publication_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Execute both queries
    const [results, countResult] = await Promise.all([
      dbQuery,
      countQuery
    ]);
    
    // Format results as SearchResultItems
    const formattedResults: SearchResultItem[] = results.map((item: any) => {
      // Parse JSON fields
      const authors = typeof item.authors === 'string' 
        ? JSON.parse(item.authors) 
        : (item.authors || []);
      
      const keywords = Array.isArray(item.keywords) 
        ? item.keywords 
        : [];
      
      return {
        id: item.record_id,
        title: item.title,
        authors: authors.map((author: string) => ({ name: author })),
        abstract: item.abstract || '',
        publicationDate: item.publicationDate,
        journal: item.journal || '',
        url: item.url || '',
        doi: item.doi || '',
        keywords: keywords,
        databaseId: `oai-pmh-${item.sourceId}`,
        provider: item.provider,
        metadata: {
          sourceId: item.sourceId
        }
      };
    });
    
    // Calculate total pages
    const totalResults = parseInt((countResult as any)?.count || '0');
    const totalPages = Math.ceil(totalResults / limit);
    
    // Return formatted response
    return {
      data: {
        results: formattedResults,
        totalResults,
        totalPages,
        page,
        executionTimeMs: Date.now() - startTime,
        databasesSearched: ['oai-pmh']
      }
    };
  } catch (error) {
    logger.error('OAI-PMH search error:', error);
    throw error;
  }
}
