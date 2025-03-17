// JSTOR API client for searching harvested metadata
import type { QueryResult } from 'pg';
import { db } from '../../../lib/db';

interface JstorSearchParams {
  query: string;
  page: number;
  limit: number;
  filters?: {
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    authors?: string[];
    journals?: string[];
    keywords?: string[];
  };
}

interface JstorQueryResult {
  id: string;
  provider: string;
  record_id: string;
  title: string;
  authors: string;
  abstract?: string;
  publication_date?: string;
  journal?: string;
  url?: string;
  doi?: string;
  keywords?: string[];
  source_id?: string;
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
    
    console.info(`Starting JSTOR search for "${query}" (page ${page}, limit ${limit})`);
    const startTime = Date.now();
    
    // Build the SQL query to search harvested metadata
    const searchQuery = {
      text: "SELECT * FROM harvested_metadata WHERE provider = 'jstor' AND to_tsvector('english', title || ' ' || COALESCE(abstract, '')) @@ plainto_tsquery('english', $1)",
      values: [query.trim()]
    };
    
    // Apply filters if provided
    let conditions = [];
    let values = [query.trim()];
    let paramCount = 1;

    if (filters) {
      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          paramCount++;
          conditions.push(`publication_date >= $${paramCount}`);
          values.push(filters.dateRange.start.toISOString().split('T')[0]);
        }
        if (filters.dateRange.end) {
          paramCount++;
          conditions.push(`publication_date <= $${paramCount}`);
          values.push(filters.dateRange.end.toISOString().split('T')[0]);
        }
      }
      
      // Author filter
      if (filters.authors && filters.authors.length > 0) {
        const authorConditions = filters.authors.map((author: string) => {
          paramCount++;
          values.push(JSON.stringify([{ name: author }]));
          return `authors @> $${paramCount}::jsonb`;
        });
        conditions.push(`(${authorConditions.join(' OR ')})`);
      }
      
      // Journal filter
      if (filters.journals && filters.journals.length > 0) {
        paramCount++;
        conditions.push(`journal = ANY($${paramCount}::text[])`);
        values.push(`{${filters.journals.join(',')}}`);

      }
      
      // Keywords filter
      if (filters.keywords && filters.keywords.length > 0) {
        paramCount++;
        conditions.push(`keywords && $${paramCount}::text[]`);
        values.push(`{${filters.keywords.join(',')}}`);

      }
    }

    // Update the search query with filters
    searchQuery.text += conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    searchQuery.values = values;
    
    // Get count of total matching records
    const countQuery = {
      text: `SELECT COUNT(*) as total FROM (${searchQuery.text}) AS subquery`,
      values: searchQuery.values
    };
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');
    
    if (totalCount === 0) {
      console.info(`No JSTOR results found for query "${query}"`);
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
    const paginatedQuery = {
      text: `${searchQuery.text} ORDER BY publication_date DESC LIMIT $${searchQuery.values.length + 1} OFFSET $${searchQuery.values.length + 2}`,
      values: [...searchQuery.values, limit, offset]
    };
    const results = await db.query(paginatedQuery);
    
    console.info(`Found ${totalCount} JSTOR results for query "${query}", returning page ${page}`);
    
    // Transform to our application format
    const transformedResults = transformJstorArticles(results.rows);
    const executionTimeMs = Date.now() - startTime;
    
    console.info(`Completed JSTOR search in ${executionTimeMs}ms`);
    
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
    console.error('Error in searchJstor:', error);
    throw error; // Propagate the error to the API route handler
  }
}

/**
 * Transform JSTOR articles to our application format
 */
function transformJstorArticles(articles: JstorQueryResult[]): JstorArticle[] {
  return articles.map(article => {
    // Parse dates for consistent formatting
    let publicationDate = null;
    if (article.publication_date) {
      try {
        publicationDate = new Date(article.publication_date);
      } catch (e) {
        console.warn(`Invalid publication date: ${article.publication_date}`, e);
      }
    }
    
    // Format publication date as YYYY-MM-DD
    const formattedDate = publicationDate 
      ? publicationDate.toISOString().split('T')[0]
      : null;
    
    // Parse authors JSON if needed
    let parsedAuthors: Array<{ name: string; identifier?: string }> = [];
    if (typeof article.authors === 'string') {
      try {
        const parsed = JSON.parse(article.authors);
        if (Array.isArray(parsed)) {
          parsedAuthors = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse authors JSON: ${article.authors}`, e);
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
      authors: parsedAuthors,
      journal: article.journal,
      publicationDate: formattedDate,
      abstract: article.abstract,
      doi: article.doi,
      keywords: keywords,
      // Add JSTOR-specific fields
      recordId: article.record_id,
      
      // Format for display in the UI
      displayTitle: `<a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a>`,
      displayAuthors: formatAuthors(parsedAuthors),
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
function formatAuthors(authors: Array<{ name: string; identifier?: string }> = []): string {
  if (!authors || authors.length === 0) {
    return '';
  }
  
  return authors
    .map(author => author.name)
    .join(', ');
}
