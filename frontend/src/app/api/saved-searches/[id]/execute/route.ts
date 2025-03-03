// API route for executing saved searches
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Mock successful execution
    console.log(`Executing saved search: ${id}`);
    
    // Return mock data with the query
    const mockData = {
      data: {
        id,
        query: `example query for saved search ${id}`,
        executedAt: new Date().toISOString(),
        executionTimeMs: 125
      }
    };
    
    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json(
      { message: 'Error executing saved search' },
      { status: 500 }
    );
  }
}