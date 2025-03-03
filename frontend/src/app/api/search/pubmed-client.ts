// PubMed API client for E-utilities
// Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/

interface PubMedSearchParams {
  query: string;
  page: number;
  limit: number;
  filters?: any;
}

interface PubMedArticle {
  uid: string;
  title: string;
  authors?: Array<{name: string, authtype: string, clusterid: string}>;
  source?: string;
  pubdate?: string;
  epubdate?: string;
  sortpubdate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  fulljournalname?: string;
  elocationid?: string;
  lang?: string[];
  pubtype?: string[];
  articleids?: Array<{idtype: string, idtypen: number, value: string}>;
  sortdate?: string;
  pmid?: string;
  doi?: string;
  abstract?: string;
}

// PubMed API endpoints
// Since the proxy doesn't work in a server environment, we'll use direct PubMed API access
const USE_DIRECT_PUBMED = true; // Force direct PubMed API calls to avoid proxy issues

// Direct PubMed API endpoints - these are absolute URLs
const DIRECT_PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DIRECT_SEARCH_ENDPOINT = `${DIRECT_PUBMED_BASE}/esearch.fcgi`;
const DIRECT_SUMMARY_ENDPOINT = `${DIRECT_PUBMED_BASE}/esummary.fcgi`;
const DIRECT_FETCH_ENDPOINT = `${DIRECT_PUBMED_BASE}/efetch.fcgi`;

// Optional API key - can be added in environment variables for higher rate limits
// When no API key is provided, use 'guest' mode with limited rate
const API_KEY = process.env.PUBMED_API_KEY || 'guest';

/**
 * Search PubMed for articles matching the query
 */
export async function searchPubMed({ query, page, limit, filters }: PubMedSearchParams) {
  try {
    // Validate input
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }
    
    console.log(`Starting PubMed search for "${query}" (page ${page}, limit ${limit})`);
    const startTime = Date.now();
    
    // Step 1: Search for article IDs matching the query
    const searchResults = await getPubMedIds(query, page, limit, filters);
    
    if (!searchResults.idlist || searchResults.idlist.length === 0) {
      console.log(`No results found for query "${query}"`);
      // No results found
      return {
        data: {
          results: [],
          totalResults: 0,
          page,
          totalPages: 0,
          executionTimeMs: Date.now() - startTime,
          databasesSearched: ['pubmed']
        }
      };
    }
    
    console.log(`Found ${searchResults.idlist.length} results for query "${query}"`);
    
    // Step 2: Get article details using the IDs
    const articles = await getArticleDetails(searchResults.idlist);
    
    if (!articles || articles.length === 0) {
      console.warn(`Failed to fetch article details for query "${query}"`);
      throw new Error('Failed to fetch article details');
    }
    
    console.log(`Retrieved details for ${articles.length} articles`);
    
    // Step 3: Transform the articles to our application format
    const results = transformArticles(articles);
    const executionTimeMs = Date.now() - startTime;
    
    console.log(`Completed search in ${executionTimeMs}ms`);
    
    return {
      data: {
        results,
        totalResults: parseInt(searchResults.count),
        page,
        totalPages: Math.ceil(parseInt(searchResults.count) / limit),
        executionTimeMs,
        databasesSearched: ['pubmed']
      }
    };
  } catch (error) {
    console.error('Error in searchPubMed:', error);
    throw error; // Propagate the error to the API route handler
  }
}

/**
 * Get article IDs from PubMed based on search query
 */
async function getPubMedIds(query: string, page: number, limit: number, filters: any) {
  try {
    // Calculate start position for pagination
    const retstart = (page - 1) * limit;
    
    // Ensure query is not empty and properly formatted
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error("Empty search query");
    }
    
    // Build the search query with any filters
    // Wrap basic query in parentheses to ensure proper boolean logic with filters
    let searchTerm = `(${cleanQuery})`;
    
    // Add date range filter if present
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      if (start && end) {
        searchTerm += ` AND ("${start}"[Date - Publication] : "${end}"[Date - Publication])`;
      } else if (start) {
        searchTerm += ` AND "${start}"[Date - Publication] : "3000"[Date - Publication]`;
      } else if (end) {
        searchTerm += ` AND "1800"[Date - Publication] : "${end}"[Date - Publication]`;
      }
    }
    
    // Add author filters if present
    if (filters?.authors?.length) {
      const authorFilters = filters.authors
        .map((author: string) => `${author}[Author]`)
        .join(' OR ');
      searchTerm += ` AND (${authorFilters})`;
    }
    
    // Add journal filters if present
    if (filters?.journals?.length) {
      const journalFilters = filters.journals
        .map((journal: string) => `"${journal}"[Journal]`)
        .join(' OR ');
      searchTerm += ` AND (${journalFilters})`;
    }
    
    // Add language filters if present
    if (filters?.languages?.length) {
      const languageFilters = filters.languages
        .map((lang: string) => {
          // Map language codes to PubMed format
          // Use correct format for language filter - needs exact syntax
          switch(lang.toLowerCase()) {
            case 'en': return 'english[Language]';
            case 'fr': return 'french[Language]';
            case 'de': return 'german[Language]';
            case 'es': return 'spanish[Language]';
            case 'it': return 'italian[Language]';
            case 'ja': return 'japanese[Language]';
            case 'zh': return 'chinese[Language]';
            case 'ru': return 'russian[Language]';
            default: return `${lang}[Language]`;
          }
        })
        .join(' OR ');
      
      if (languageFilters) {
        searchTerm += ` AND (${languageFilters})`;
      }
    }
    
    // Add article type filters if present
    if (filters?.articleTypes?.length) {
      const articleTypeFilters = filters.articleTypes
        .map((type: string) => {
          // Map article types to PubMed format
          switch(type.toLowerCase()) {
            case 'review': return '"review"[Publication Type]';
            case 'clinical trial': return '"clinical trial"[Publication Type]';
            case 'rct': 
            case 'randomized controlled trial': 
              return '"randomized controlled trial"[Publication Type]';
            case 'meta-analysis': return '"meta-analysis"[Publication Type]';
            case 'systematic review': return '"systematic review"[Publication Type]';
            case 'practice guideline': return '"practice guideline"[Publication Type]';
            case 'case report': return '"case reports"[Publication Type]';
            default: return `"${type}"[Publication Type]`;
          }
        })
        .join(' OR ');
      
      if (articleTypeFilters) {
        searchTerm += ` AND (${articleTypeFilters})`;
      }
    }
    
    // Log the final search term for debugging
    console.log(`PubMed search term: "${searchTerm}"`);
    
    // Build the search URL with parameters
    const params = new URLSearchParams({
      db: 'pubmed',
      term: searchTerm,
      retmax: limit.toString(),
      retstart: retstart.toString(),
      retmode: 'json',
      sort: 'relevance',
      usehistory: 'y'  // Use history to improve performance for subsequent requests
    });
    
    // Add API key for higher rate limits
    if (API_KEY && API_KEY !== 'guest') {
      params.append('api_key', API_KEY);
    }
    
    // We're using direct PubMed API access to avoid proxy issues in server context
    const url = `${DIRECT_SEARCH_ENDPOINT}?${params.toString()}`;
    console.log(`Final PubMed search URL: ${url}`);
    
    // Implement retry logic for network issues
    const maxRetries = 3;
    let response;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to connect to PubMed API...`);
        response = await fetch(url, {
          // Add timeout to avoid hanging requests
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          throw new Error(`PubMed search failed: ${response.statusText}`);
        }
        
        // If successful, break out of retry loop
        break;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff (1s, 2s, 4s...)
          const backoffTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // If all retries failed, throw the last error
    if (!response) {
      console.error(`All ${maxRetries} attempts to connect to PubMed API failed`);
      throw lastError;
    }
    
    const data = await response.json();
    console.log('PubMed search response:', JSON.stringify(data).substring(0, 500) + '...');
    
    if (!data.esearchresult) {
      console.error('Invalid PubMed response format:', data);
      throw new Error('Invalid response format from PubMed API');
    }
    
    return {
      idlist: data.esearchresult.idlist || [],
      count: data.esearchresult.count || '0',
      webenv: data.esearchresult.webenv,
      querykey: data.esearchresult.querykey
    };
  } catch (error) {
    console.error('Error searching PubMed:', error);
    throw error; // Propagate the error instead of silently returning empty results
  }
}

/**
 * Get details for multiple PubMed articles by their IDs
 */
async function getArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  try {
    if (!pmids.length) return [];
    
    // Build the summary URL with parameters
    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json'
    });
    
    if (API_KEY) {
      params.append('api_key', API_KEY);
    }
    
    // We're using direct PubMed API access to avoid proxy issues in server context
    const url = `${DIRECT_SUMMARY_ENDPOINT}?${params.toString()}`;
    
    // Fetch article summaries with retry mechanism
    console.log(`Fetching article details from PubMed for ${pmids.length} articles`);
    console.log(`URL: ${url}`);
    
    const maxRetries = 3;
    let response;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to fetch article details...`);
        response = await fetch(url, {
          // Add timeout to avoid hanging requests
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch article details: ${response.statusText}`);
        }
        
        // If successful, break out of retry loop
        break;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff (1s, 2s, 4s...)
          const backoffTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // If all retries failed, throw the last error
    if (!response) {
      console.error(`All ${maxRetries} attempts to fetch article details failed`);
      throw lastError;
    }
    
    const data = await response.json();
    
    // Extract articles from the result
    const articles: PubMedArticle[] = [];
    if (data.result && data.result.uids && data.result.uids.length > 0) {
      for (const id of data.result.uids) {
        if (data.result[id]) {
          articles.push(data.result[id]);
        }
      }
    }
    
    // For each article, fetch the abstract using efetch if not available in summary
    const articlesWithAbstracts = await addAbstracts(articles);
    
    return articlesWithAbstracts;
  } catch (error) {
    console.error('Error fetching article details:', error);
    return [];
  }
}

/**
 * Add abstracts to articles that don't have them
 */
async function addAbstracts(articles: PubMedArticle[]): Promise<PubMedArticle[]> {
  try {
    // Get IDs of articles without abstracts
    const idsWithoutAbstract = articles
      .filter(article => !article.abstract)
      .map(article => article.uid);
    
    if (idsWithoutAbstract.length === 0) {
      return articles;
    }
    
    // Don't try to fetch too many abstracts at once
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < idsWithoutAbstract.length; i += batchSize) {
      batches.push(idsWithoutAbstract.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batch of batches) {
      // Fetch abstracts for these articles
      const params = new URLSearchParams({
        db: 'pubmed',
        id: batch.join(','),
        retmode: 'xml',
        rettype: 'abstract'
      });
      
      if (API_KEY && API_KEY !== 'guest') {
        params.append('api_key', API_KEY);
      }
      
      // We're using direct PubMed API access to avoid proxy issues in server context
      const url = `${DIRECT_FETCH_ENDPOINT}?${params.toString()}`;
      
      console.log(`Fetching abstracts for ${batch.length} articles`);
      console.log(`URL: ${url}`);
      
      const maxRetries = 3;
      let response;
      let lastError;
      let success = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt} to fetch abstracts...`);
          response = await fetch(url, {
            // Add timeout to avoid hanging requests
            signal: AbortSignal.timeout(15000)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch abstracts: ${response.statusText}`);
          }
          
          // If successful, mark as success and break out of retry loop
          success = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt} failed to fetch abstracts:`, error);
          
          if (attempt < maxRetries) {
            // Exponential backoff (1s, 2s, 4s...)
            const backoffTime = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retrying in ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }
      
      if (!success) {
        console.error(`All ${maxRetries} attempts to fetch abstracts failed, continuing without abstracts for this batch`);
        continue; // Skip this batch but try others
      }
      
      const xmlText = await response.text();
      
      // More robust abstract extraction with fallback patterns
      for (const id of batch) {
        // Try several patterns to match abstract in XML
        let abstractText = null;
        
        // Pattern 1: Direct AbstractText match
        const abstractRegex1 = new RegExp(`<PubmedArticle>.*?<PMID.*?>${id}</PMID>.*?<Abstract>\\s*<AbstractText.*?>(.*?)</AbstractText>\\s*</Abstract>`, 's');
        const match1 = xmlText.match(abstractRegex1);
        
        if (match1 && match1[1]) {
          abstractText = match1[1];
        } else {
          // Pattern 2: Multiple AbstractText sections
          const abstractRegex2 = new RegExp(`<PubmedArticle>.*?<PMID.*?>${id}</PMID>.*?<Abstract>(.*?)</Abstract>`, 's');
          const match2 = xmlText.match(abstractRegex2);
          
          if (match2 && match2[1]) {
            // Extract all AbstractText sections and combine them
            const abstractSection = match2[1];
            const abstractTexts: string[] = [];
            
            // Use a simple regex to extract all AbstractText sections
            const abstractTextRegex = /<AbstractText.*?>(.*?)<\/AbstractText>/g;
            let textMatch;
            
            while ((textMatch = abstractTextRegex.exec(abstractSection)) !== null) {
              if (textMatch[1]) {
                abstractTexts.push(textMatch[1]);
              }
            }
            
            if (abstractTexts.length > 0) {
              abstractText = abstractTexts.join(' ');
            }
          }
        }
        
        if (abstractText) {
          // Find the article and add the abstract
          const article = articles.find(a => a.uid === id);
          if (article) {
            // Clean the abstract text by removing HTML tags
            article.abstract = abstractText.replace(/<\/?[^>]+(>|$)/g, '');
          }
        }
      }
    }
    
    return articles;
  } catch (error) {
    console.error('Error adding abstracts:', error);
    return articles; // Return original articles if we can't add abstracts
  }
}

/**
 * Transform PubMed articles to our application format
 */
function transformArticles(articles: PubMedArticle[]) {
  return articles.map(article => {
    // Extract DOI if available
    let doi = article.articleids?.find(id => id.idtype === 'doi')?.value;
    
    // If DOI is not in articleids, check elocationid
    if (!doi && article.elocationid?.startsWith('doi:')) {
      doi = article.elocationid.substring(4);
    }
    
    // Extract PMID
    const pmid = article.articleids?.find(id => id.idtype === 'pubmed')?.value || article.uid;
    
    // Format authors
    const authors = article.authors?.map(author => ({
      name: author.name,
      affiliation: undefined
    })) || [];
    
    // Get the publication date
    let publicationDate;
    try {
      // Try to parse the pubdate
      publicationDate = article.pubdate ? new Date(article.pubdate) : undefined;
      
      // Check if date is valid
      if (publicationDate && isNaN(publicationDate.getTime())) {
        // Try alternative date formats if standard parsing fails
        const dateMatch = article.pubdate.match(/(\d{4})(?:\s+(\w+))?(?:\s+(\d+))?/);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          const monthNum = getMonthNumber(month);
          publicationDate = new Date(
            parseInt(year),
            monthNum !== undefined ? monthNum : 0,
            day ? parseInt(day) : 1
          );
        } else {
          publicationDate = undefined;
        }
      }
    } catch (e) {
      publicationDate = undefined;
    }
    
    return {
      id: article.uid,
      databaseId: 'pubmed',
      title: article.title.replace(/\.$/, '') || 'No title available',
      authors,
      abstract: article.abstract,
      journal: {
        name: article.fulljournalname || article.source || 'Unknown Journal',
        volume: article.volume,
        issue: article.issue,
        pages: article.pages
      },
      doi,
      publicationDate: publicationDate?.toISOString(),
      keywords: [],
      articleType: article.pubtype?.length ? article.pubtype[0] : undefined,
      language: article.lang?.length ? article.lang[0] : undefined,
      metadata: {
        pmid
      }
    };
  });
}

/**
 * Helper function to convert month name to number
 */
function getMonthNumber(monthName?: string): number | undefined {
  if (!monthName) return undefined;
  
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };
  
  return months[monthName.toLowerCase()];
}