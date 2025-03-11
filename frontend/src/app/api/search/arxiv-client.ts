// arXiv API client for article search
// Documentation: https://info.arxiv.org/help/api/index.html

import { api } from '@/config/api';
import { logger } from '@/lib/logger';

interface ArXivSearchParams {
  query: string;
  page: number;
  limit: number;
  filters?: any;
}

interface ArXivEntry {
  id: string;
  title: string;
  summary: string;
  updated: string;
  published: string;
  authors: Array<{ name: string }>;
  doi?: string;
  categories: string[];
  links: Array<{ href: string, rel: string, type?: string, title?: string }>;
  journalRef?: string;
  comment?: string;
  primaryCategory?: string;
}

// arXiv API endpoints
const ARXIV_CONFIG = api.arxiv;
const ARXIV_BASE_URL = ARXIV_CONFIG.baseUrl;
const ARXIV_SEARCH_ENDPOINT = `${ARXIV_BASE_URL}${ARXIV_CONFIG.endpoints.search}`;

/**
 * Search arXiv for articles matching the query
 */
export async function searchArXiv({ query, page, limit, filters }: ArXivSearchParams) {
  try {
    // Validate input
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }
    
    logger.info(`Starting arXiv search for "${query}" (page ${page}, limit ${limit})`);
    const startTime = Date.now();
    
    // Format the search query for arXiv
    const formattedQuery = formatArXivQuery(query, filters);
    
    // Calculate start index for pagination (arXiv uses 0-based indexing)
    const start = (page - 1) * limit;
    
    // Get search results from arXiv
    const results = await getArXivResults(formattedQuery, start, limit);
    
    if (!results || !results.entries || results.entries.length === 0) {
      logger.info(`No arXiv results found for query "${query}"`);
      return {
        data: {
          results: [],
          totalResults: 0,
          page,
          totalPages: 0,
          executionTimeMs: Date.now() - startTime,
          databasesSearched: ['arxiv']
        }
      };
    }
    
    // Transform entries to our application format
    const transformedResults = transformArXivEntries(results.entries);
    const executionTimeMs = Date.now() - startTime;
    
    logger.info(`Completed arXiv search in ${executionTimeMs}ms, found ${results.totalResults} results`);
    
    return {
      data: {
        results: transformedResults,
        totalResults: results.totalResults,
        page,
        totalPages: Math.ceil(results.totalResults / limit),
        executionTimeMs,
        databasesSearched: ['arxiv']
      }
    };
  } catch (error) {
    logger.error('Error in searchArXiv:', error);
    throw error; // Propagate the error to the API route handler
  }
}

/**
 * Format the search query for arXiv API
 */
function formatArXivQuery(query: string, filters?: any): string {
  let formattedQuery = query.trim();
  
  // Handle special characters
  formattedQuery = formattedQuery.replace(/[&]/g, ' AND ');
  formattedQuery = formattedQuery.replace(/[|]/g, ' OR ');
  
  // Add filters if provided
  if (filters) {
    // Date range filter
    if (filters.dateRange) {
      // arXiv doesn't directly support date range filtering in the API
      // We'll filter the results later in the transformation stage
    }
    
    // Author filter
    if (filters.authors && filters.authors.length > 0) {
      const authorFilters = filters.authors
        .map((author: string) => `au:${author}`)
        .join(' AND ');
      
      formattedQuery = `${formattedQuery} AND (${authorFilters})`;
    }
    
    // Category filter (arXiv specific)
    if (filters.categories && filters.categories.length > 0) {
      const categoryFilters = filters.categories
        .map((category: string) => `cat:${category}`)
        .join(' OR ');
      
      formattedQuery = `${formattedQuery} AND (${categoryFilters})`;
    }
  }
  
  return formattedQuery;
}

/**
 * Get search results from arXiv API
 */
async function getArXivResults(query: string, start: number, limit: number) {
  // Build URL with parameters
  const params = new URLSearchParams({
    search_query: query,
    start: start.toString(),
    max_results: limit.toString()
  });
  
  const url = `${ARXIV_SEARCH_ENDPOINT}?${params.toString()}`;
  logger.info(`arXiv API request URL: ${url}`);
  
  // Implement retry logic
  const maxRetries = 3;
  let response: Response | null = null;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempt ${attempt} to connect to arXiv API...`);
      
      // Add a delay for rate limiting (arXiv allows 1 request per 3 seconds)
      if (attempt > 1) {
        const delayMs = 3000 * attempt; // Increase delay with each retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      response = await fetch(url, {
        signal: AbortSignal.timeout(15000), // 15 second timeout
        headers: {
          'User-Agent': 'ThinkLeap/1.0 (https://thinkleap.com; support@thinkleap.com)',
          'Accept': 'application/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`arXiv search failed: ${response.statusText}`);
      }
      
      // Success, break out of retry loop
      break;
    } catch (error) {
      lastError = error;
      logger.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const backoffTime = Math.pow(2, attempt) * 1000;
        logger.info(`Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  // If all retries failed, throw the last error
  if (!response) {
    logger.error(`All ${maxRetries} attempts to connect to arXiv API failed`);
    throw lastError;
  }
  
  // Get response as text
  const xmlText = await response.text();
  
  // Parse XML response
  return parseArXivResponse(xmlText);
}

/**
 * Parse the XML response from arXiv
 * Uses a simple regex-based approach to parse XML that works on both server and client
 */
function parseArXivResponse(xmlText: string) {
  try {
    // Extract total results using regex
    const totalResultsMatch = xmlText.match(/<opensearch:totalResults[^>]*>([^<]+)<\/opensearch:totalResults>/);
    const totalResults = totalResultsMatch ? parseInt(totalResultsMatch[1]) : 0;
    
    // Regular expressions for extracting data
    const entryRegex = /<entry[\s\S]*?<\/entry>/g;
    const idRegex = /<id[^>]*>([^<]+)<\/id>/;
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/;
    const summaryRegex = /<summary[^>]*>([\s\S]*?)<\/summary>/;
    const updatedRegex = /<updated[^>]*>([^<]+)<\/updated>/;
    const publishedRegex = /<published[^>]*>([^<]+)<\/published>/;
    const authorRegex = /<author[\s\S]*?<name[^>]*>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    const linkRegex = /<link([^>]*)\/?>/g;
    const categoryRegex = /<category([^>]*)\/?>/g;
    const primaryCategoryRegex = /<arxiv:primary_category([^>]*)\/?>/;
    const doiRegex = /<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/;
    const journalRefRegex = /<arxiv:journal_ref[^>]*>([^<]+)<\/arxiv:journal_ref>/;
    const commentRegex = /<arxiv:comment[^>]*>([^<]+)<\/arxiv:comment>/;
    
    const entries: ArXivEntry[] = [];
    
    // Extract entry elements
    let entryMatch;
    while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
      const entryText = entryMatch[0];
      
      // Extract basic info
      const idMatch = entryText.match(idRegex);
      const titleMatch = entryText.match(titleRegex);
      const summaryMatch = entryText.match(summaryRegex);
      const updatedMatch = entryText.match(updatedRegex);
      const publishedMatch = entryText.match(publishedRegex);
      
      // Extract authors
      const authors: Array<{ name: string }> = [];
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entryText)) !== null) {
        if (authorMatch[1]) {
          authors.push({ name: authorMatch[1] });
        }
      }
      
      // Extract links
      const links: Array<{ href: string, rel: string, type?: string, title?: string }> = [];
      let linkMatch;
      while ((linkMatch = linkRegex.exec(entryText)) !== null) {
        const linkAttrs = linkMatch[1];
        const hrefMatch = linkAttrs.match(/href="([^"]+)"/); 
        const relMatch = linkAttrs.match(/rel="([^"]+)"/); 
        
        if (hrefMatch && relMatch) {
          const linkObj: { href: string, rel: string, type?: string, title?: string } = {
            href: hrefMatch[1],
            rel: relMatch[1]
          };
          
          const typeMatch = linkAttrs.match(/type="([^"]+)"/); 
          if (typeMatch) linkObj.type = typeMatch[1];
          
          const titleMatch = linkAttrs.match(/title="([^"]+)"/); 
          if (titleMatch) linkObj.title = titleMatch[1];
          
          links.push(linkObj);
        }
      }
      
      // Extract categories
      const categories: string[] = [];
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(entryText)) !== null) {
        const categoryAttrs = categoryMatch[1];
        const termMatch = categoryAttrs.match(/term="([^"]+)"/); 
        
        if (termMatch) {
          categories.push(termMatch[1]);
        }
      }
      
      // Extract primary category
      let primaryCategory = categories[0];
      const primaryCategoryMatch = entryText.match(primaryCategoryRegex);
      if (primaryCategoryMatch) {
        const termMatch = primaryCategoryMatch[1].match(/term="([^"]+)"/); 
        if (termMatch) {
          primaryCategory = termMatch[1];
        }
      }
      
      // Get DOI if available
      let doi: string | undefined;
      const doiMatch = entryText.match(doiRegex);
      if (doiMatch) {
        doi = doiMatch[1];
      }
      
      // Create entry object
      const entryObj: ArXivEntry = {
        id: idMatch ? idMatch[1] : '',
        title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '',
        summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '',
        updated: updatedMatch ? updatedMatch[1] : '',
        published: publishedMatch ? publishedMatch[1] : '',
        authors,
        categories,
        links,
        primaryCategory
      };
      
      // Add optional fields if available
      const journalRefMatch = entryText.match(journalRefRegex);
      if (journalRefMatch) entryObj.journalRef = journalRefMatch[1];
      
      const commentMatch = entryText.match(commentRegex);
      if (commentMatch) entryObj.comment = commentMatch[1];
      
      if (doi) entryObj.doi = doi;
      
      entries.push(entryObj);
    }
    
    return {
      totalResults,
      entries
    };
  } catch (error: any) {
    logger.error('Error parsing arXiv XML response:', error);
    throw new Error(`Failed to parse arXiv response: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Transform arXiv entries to our application format
 */
function transformArXivEntries(entries: ArXivEntry[]) {
  return entries.map(entry => {
    // Extract the arXiv ID from the URL
    const arxivId = entry.id.split('/').pop() || '';
    
    // Find the PDF link
    const pdfLink = entry.links.find(link => link.title === 'pdf' || link.type === 'application/pdf');
    
    // Find the abstract page link
    const abstractLink = entry.links.find(link => link.rel === 'alternate');
    
    // Format publication date
    let publicationDate: string | null = null;
    try {
      const date = new Date(entry.published);
      publicationDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      logger.warn(`Invalid publication date: ${entry.published}`, e);
    }
    
    // Format authors for display
    const displayAuthors = entry.authors
      .map(author => author.name)
      .join(', ');
    
    return {
      id: arxivId,
      source: 'arxiv',
      title: entry.title,
      url: abstractLink?.href || `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: pdfLink?.href || `https://arxiv.org/pdf/${arxivId}.pdf`,
      authors: entry.authors,
      abstract: entry.summary,
      publicationDate,
      doi: entry.doi,
      
      // arXiv-specific fields
      categories: entry.categories,
      primaryCategory: entry.primaryCategory,
      journalReference: entry.journalRef,
      comment: entry.comment,
      
      // Format for display in the UI
      displayTitle: `<a href="${abstractLink?.href || `https://arxiv.org/abs/${arxivId}`}" target="_blank" rel="noopener noreferrer">${entry.title}</a>`,
      displayAuthors,
      displayJournal: entry.journalRef || `arXiv:${arxivId}`,
      displayDate: publicationDate,
      
      // Add highlight matches for the search term (would need to be enhanced)
      matchDetails: {
        titleMatches: [],
        abstractMatches: []
      }
    };
  });
}
