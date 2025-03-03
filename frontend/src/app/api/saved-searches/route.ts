// API route for saved searches
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';
  const sortBy = searchParams.get('sortBy') || 'lastExecutedAt';

  try {
    // Mock data for development
    console.log(`Fetching saved searches: page=${page}, limit=${limit}, sortBy=${sortBy}`);
    
    // Create mock saved searches data
    const mockData = {
      data: Array(parseInt(limit)).fill(null).map((_, i) => ({
        id: `search-${i+1}`,
        userId: 'user-1',
        name: `Saved Search ${i+1}`,
        description: i % 2 === 0 ? `Description for saved search ${i+1}` : undefined,
        query: `example query ${i+1}`,
        filters: {},
        lastExecutedAt: i % 3 === 0 ? new Date(Date.now() - i * 86400000).toISOString() : undefined,
        executionCount: Math.floor(Math.random() * 20),
        createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - i * 86400000).toISOString()
      })),
      pagination: {
        total: 25,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(25 / parseInt(limit))
      }
    };
    
    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json(
      { message: 'Error fetching saved searches' },
      { status: 500 }
    );
  }
}