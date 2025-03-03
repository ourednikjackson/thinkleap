// API route for search with PubMed integration
import { NextRequest, NextResponse } from 'next/server';
import { searchPubMed } from './pubmed-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const filtersStr = searchParams.get('filters') || '{}';
    
    if (!query) {
      return NextResponse.json(
        { message: 'Query parameter is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`API Route: Searching PubMed for: "${query}" (page ${page}, limit ${limit})`);
    
    try {
      // Parse filters from string
      let filters = {};
      try {
        filters = JSON.parse(filtersStr);
      } catch (parseError) {
        console.warn(`Failed to parse filters JSON: ${filtersStr}`, parseError);
        // Continue with empty filters rather than failing the request
      }
      
      // Execute PubMed search
      const results = await searchPubMed({
        query,
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      });
      
      console.log(`API Route: Search completed successfully with ${results.data.results.length} results`);
      return NextResponse.json(results);
    } catch (searchError: any) {
      console.error('PubMed search error:', searchError);
      return NextResponse.json(
        { 
          message: `PubMed search failed: ${searchError.message || 'Unknown error'}`,
          error: searchError.message
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        message: 'Error processing search request',
        error: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}