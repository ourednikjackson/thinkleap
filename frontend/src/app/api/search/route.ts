// API route for search with PubMed, JSTOR, arXiv and OAI-PMH integration
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { searchPubMed } from './pubmed-client';
import { searchJstor } from './jstor-client';
import { searchOaiPmh } from './oai-pmh-client';
import { searchArXiv } from './arxiv-client';
import { logger } from '../../../lib/logger';

/**
 * Merge search results from multiple sources
 */
function mergeResults(resultsA: any, resultsB: any) {
  if (!resultsA.data || !resultsA.data.results) {
    return resultsB;
  }
  if (!resultsB.data || !resultsB.data.results) {
    return resultsA;
  }
  
  return {
    data: {
      results: [...resultsA.data.results, ...resultsB.data.results],
      totalResults: (resultsA.data.totalResults || 0) + (resultsB.data.totalResults || 0),
      page: resultsA.data.page, // Use the page from the first result set
      totalPages: Math.max(resultsA.data.totalPages || 0, resultsB.data.totalPages || 0),
      executionTimeMs: Math.max(resultsA.data.executionTimeMs || 0, resultsB.data.executionTimeMs || 0),
      databasesSearched: [
        ...(resultsA.data.databasesSearched || []),
        ...(resultsB.data.databasesSearched || [])
      ]
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const filtersStr = searchParams.get('filters') || '{}';
    const source = searchParams.get('source') || 'all'; // 'all', 'pubmed', or 'jstor'
    
    if (!query) {
      return NextResponse.json(
        { message: 'Query parameter is required' }, 
        { status: 400 }
      );
    }
    
    logger.info(`API Route: Searching for: "${query}" (source: ${source}, page ${page}, limit ${limit})`);
    
    try {
      // Parse filters from string
      let filters = {};
      try {
        filters = JSON.parse(filtersStr);
      } catch (parseError) {
        logger.warn(`Failed to parse filters JSON: ${filtersStr}`, parseError);
        // Continue with empty filters rather than failing the request
      }
      
      // Determine which sources to search
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      let results = { data: { results: [], totalResults: 0, page: pageNum, totalPages: 0, executionTimeMs: 0, databasesSearched: [] } };
      const searchPromises = [];
      
      // Search PubMed if requested
      if (source === 'all' || source === 'pubmed') {
        searchPromises.push(
          searchPubMed({
            query,
            page: pageNum,
            limit: limitNum,
            filters
          }).catch(err => {
            logger.error('PubMed search error:', err);
            return { 
              data: { 
                results: [], 
                totalResults: 0, 
                page: pageNum, 
                totalPages: 0, 
                executionTimeMs: 0, 
                databasesSearched: ['pubmed'],
                error: err.message 
              } 
            };
          })
        );
      }
      
      // Search JSTOR if requested
      if (source === 'all' || source === 'jstor') {
        searchPromises.push(
          searchJstor({
            query,
            page: pageNum,
            limit: limitNum,
            filters
          }).catch(err => {
            logger.error('JSTOR search error:', err);
            return { 
              data: { 
                results: [], 
                totalResults: 0, 
                page: pageNum, 
                totalPages: 0, 
                executionTimeMs: 0, 
                databasesSearched: ['jstor'],
                error: err.message
              } 
            };
          })
        );
      }
      
      // Search arXiv if requested
      if (source === 'all' || source === 'arxiv') {
        searchPromises.push(
          searchArXiv({
            query,
            page: pageNum,
            limit: limitNum,
            filters
          }).catch(err => {
            logger.error('arXiv search error:', err);
            return { 
              data: { 
                results: [], 
                totalResults: 0, 
                page: pageNum, 
                totalPages: 0, 
                executionTimeMs: 0, 
                databasesSearched: ['arxiv'],
                error: err.message
              } 
            };
          })
        );
      }
      
      // Search OAI-PMH sources if requested
      if (source.startsWith('oai-pmh-')) {
        // Extract the source ID from the source parameter
        const sourceId = source.replace('oai-pmh-', '');
        
        searchPromises.push(
          searchOaiPmh({
            query,
            page: pageNum,
            limit: limitNum,
            filters,
            sourceId
          }).catch(err => {
            logger.error(`OAI-PMH search error (sourceId: ${sourceId}):`, err);
            return { 
              data: { 
                results: [], 
                totalResults: 0, 
                page: pageNum, 
                totalPages: 0, 
                executionTimeMs: 0, 
                databasesSearched: ['oai-pmh'],
                error: err.message
              } 
            };
          })
        );
      } else if (source === 'all') {
        // For 'all' sources, include all active OAI-PMH sources
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/oai-pmh/sources?status=active`);
          if (response.ok) {
            const { data: sources } = await response.json();
            
            // Add search promises for each active OAI-PMH source
            for (const source of sources) {
              searchPromises.push(
                searchOaiPmh({
                  query,
                  page: pageNum,
                  limit: limitNum,
                  filters,
                  sourceId: source.id
                }).catch(err => {
                  logger.error(`OAI-PMH search error (sourceId: ${source.id}):`, err);
                  return { 
                    data: { 
                      results: [], 
                      totalResults: 0, 
                      page: pageNum, 
                      totalPages: 0, 
                      executionTimeMs: 0, 
                      databasesSearched: ['oai-pmh'],
                      error: err.message
                    } 
                  };
                })
              );
            }
          }
        } catch (error) {
          logger.error('Error fetching OAI-PMH sources for search:', error);
        }
      }
      
      // Wait for all search promises to resolve
      const searchResults = await Promise.all(searchPromises);
      
      // Merge results from all sources
      for (const result of searchResults) {
        results = mergeResults(results, result);
      }
      
      logger.info(`API Route: Search completed successfully with ${results.data.results.length} total results`);
      
      // Sort combined results if needed (for 'all' source)
      if (source === 'all' && sortBy === 'date' && results.data.results.length > 0) {
        results.data.results.sort((a: any, b: any) => {
          const dateA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
          const dateB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
          return dateB - dateA; // Sort by date descending (newest first)
        });
      }
      
      return NextResponse.json(results);
    } catch (searchError: any) {
      logger.error('Search error:', searchError);
      return NextResponse.json(
        { 
          message: `Search failed: ${searchError.message || 'Unknown error'}`,
          error: searchError.message
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    logger.error('Search API error:', error);
    return NextResponse.json(
      { 
        message: 'Error processing search request',
        error: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}