// JSTOR API client for searching harvested metadata
import { db } from '../../../lib/db';
import { logger } from '../../../lib/logger';

interface JstorSearchParams {
  query: string;
  page: number;
  limit: number;
  filters?: any;
}

interface JstorArticle {
  id: string;
  title: string;
  authors?: Array<{ name: string, identifier?: string }>;
  abstract?: string;
  publication_date?: string;
  journal?: string;
  url?: string;
  doi?: string;
  keywords?: string[];
}

/**
 * Search JSTOR for articles matching the query
 */
export async function searchJstor({ query, page, limit, filters }: JstorSearchParams) {
  try {
    // Validate input
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }
    
    logger.info(`Starting JSTOR search for "${query}" (page ${page}, limit ${limit})`);
    const startTime = Date.now();
    
    // Build the SQL query to search harvested metadata
    const searchQuery = db.from('harvested_metadata')
      .where('provider', 'jstor')
      .whereRaw("to_tsvector('english', title || ' ' || COALESCE(abstract, '')) @@ plainto_tsquery('english', ?)", 
        [query.trim()]);
    
    // Apply filters if provided
    if (filters) {
      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          searchQuery.where('publication_date', '>=', filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          searchQuery.where('publication_date', '<=', filters.dateRange.end);
        }
      }
      
      // Author filter
      if (filters.authors && filters.authors.length > 0) {
        // Since authors are stored as JSONB, we need to use JSONB containment operators
        const authorConditions = filters.authors.map((author: string) => {
          return db.raw(`authors @> ?::jsonb`, [JSON.stringify([{ name: author }])]);
        });
        
        searchQuery.where(function() {
          authorConditions.forEach((condition: any) => {
            this.orWhere(condition);
          });
        });
      }
      
      // Journal filter
      if (filters.journals && filters.journals.length > 0) {
        searchQuery.whereIn('journal', filters.journals);
      }
      
      // Keywords filter
      if (filters.keywords && filters.keywords.length > 0) {
        searchQuery.where(function() {
          filters.keywords.forEach((keyword: string) => {
            this.orWhereRaw('? = ANY(keywords)', [keyword]);
          });
        });
      }
    }
    
    // Get count of total matching records
    const countResult = await searchQuery.clone().count('* as total').first();
    const totalCount = parseInt(countResult?.total || '0');
    
    if (totalCount === 0) {
      logger.info(`No JSTOR results found for query "${query}"`);
      return {
        data: {
          results: [],
          totalResults: 0,
          page,
          totalPages: 0,
          executionTimeMs: Date.now() - startTime,
          databasesSearched: ['jstor']
        }
      };
    }
    
    // Get paginated results
    const offset = (page - 1) * limit;
    const results = await searchQuery
      .select('*')
      .orderBy('publication_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    logger.info(`Found ${totalCount} JSTOR results for query "${query}", returning page ${page}`);
    
    // Transform to our application format
    const transformedResults = transformJstorArticles(results);
    const executionTimeMs = Date.now() - startTime;
    
    logger.info(`Completed JSTOR search in ${executionTimeMs}ms`);
    
    return {
      data: {
        results: transformedResults,
        totalResults: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        executionTimeMs,
        databasesSearched: ['jstor']
      }
    };
  } catch (error) {
    logger.error('Error in searchJstor:', error);
    throw error; // Propagate the error to the API route handler
  }
}

/**
 * Transform JSTOR articles to our application format
 */
function transformJstorArticles(articles: any[]): any[] {
  return articles.map(article => {
    // Parse dates for consistent formatting
    let publicationDate = null;
    if (article.publication_date) {
      try {
        publicationDate = new Date(article.publication_date);
      } catch (e) {
        logger.warn(`Invalid publication date: ${article.publication_date}`, e);
      }
    }
    
    // Format publication date as YYYY-MM-DD
    const formattedDate = publicationDate 
      ? publicationDate.toISOString().split('T')[0]
      : null;
    
    // Parse authors JSON if needed
    let authors = article.authors;
    if (typeof authors === 'string') {
      try {
        authors = JSON.parse(authors);
      } catch (e) {
        logger.warn(`Failed to parse authors JSON: ${authors}`, e);
        authors = [];
      }
    }
    
    // Ensure keywords is an array
    let keywords = article.keywords || [];
    if (!Array.isArray(keywords) && typeof keywords === 'string') {
      try {
        keywords = JSON.parse(keywords);
      } catch (e) {
        keywords = [];
      }
    }
    
    return {
      id: article.id,
      source: 'jstor',
      title: article.title,
      url: article.url,
      authors: authors || [],
      journal: article.journal,
      publicationDate: formattedDate,
      abstract: article.abstract,
      doi: article.doi,
      keywords: keywords,
      // Add JSTOR-specific fields
      recordId: article.record_id,
      
      // Format for display in the UI
      displayTitle: `<a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a>`,
      displayAuthors: formatAuthors(authors),
      displayJournal: article.journal,
      displayDate: formattedDate,
      
      // Add highlight matches for the search term (would need to be enhanced)
      matchDetails: {
        titleMatches: [],
        abstractMatches: []
      }
    };
  });
}

/**
 * Format authors for display
 */
function formatAuthors(authors: any[] = []): string {
  if (!authors || authors.length === 0) {
    return '';
  }
  
  return authors
    .map(author => author.name)
    .join(', ');
}
