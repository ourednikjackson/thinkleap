// OAI-PMH search client
import { 
  SearchParams, 
  SearchResult, 
  SearchResultItem 
} from '@thinkleap/shared/types/search';

interface OaiPmhSearchOptions extends SearchParams {
  sourceId?: string;
  userId: string;
}

/**
 * Search harvested OAI-PMH metadata
 */
export async function searchOaiPmh(options: OaiPmhSearchOptions): Promise<{ data: SearchResult }> {
  const startTime = Date.now();
  
  try {
    // Build query parameters
    const params = new URLSearchParams({
      query: options.query || '',
      page: String(options.page || 1),
      limit: String(options.limit || 10)
    });

    if (options.sourceId) {
      params.append('sourceId', options.sourceId);
    }

    if (options.filters?.dateRange?.start) {
      params.append('dateStart', options.filters.dateRange.start.toISOString().split('T')[0]);
    }

    if (options.filters?.dateRange?.end) {
      params.append('dateEnd', options.filters.dateRange.end.toISOString().split('T')[0]);
    }

    // Make request to external API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/search/oai-pmh?${params.toString()}`,
      {
        headers: {
          'X-User-Id': options.userId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search OAI-PMH metadata');
    }

    const data = await response.json();

    // Format results as SearchResultItems
    const formattedResults: SearchResultItem[] = data.results.map((item: any) => {
      // Parse JSON fields if needed
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

    // Return formatted response
    return {
      data: {
        results: formattedResults,
        totalResults: data.totalResults,
        totalPages: data.totalPages,
        page: data.page,
        executionTimeMs: Date.now() - startTime,
        databasesSearched: ['oai-pmh']
      }
    };
  } catch (error) {
    console.error('OAI-PMH search error:', error);
    throw error;
  }
}
