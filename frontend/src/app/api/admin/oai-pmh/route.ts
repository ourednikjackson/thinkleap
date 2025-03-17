import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

/**
 * GET - List all OAI-PMH sources
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query string
    let queryString = `page=${page}&limit=${limit}`;
    if (status) {
      queryString += `&status=${status}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources?${queryString}`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch OAI-PMH sources');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching OAI-PMH sources:', error);
    return NextResponse.json(
      { message: 'Failed to fetch OAI-PMH sources', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new OAI-PMH source
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.oai_endpoint || !body.metadata_prefix) {
      return NextResponse.json(
        { message: 'Missing required fields: name, oai_endpoint, metadata_prefix' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        name: body.name,
        oai_endpoint: body.oai_endpoint,
        metadata_prefix: body.metadata_prefix,
        set_spec: body.set_spec || null,
        filter_providers: body.filter_providers || ['jstor'],
        status: body.status || 'inactive',
        harvest_frequency: body.harvest_frequency || '0 0 * * *' // Default: daily at midnight
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create OAI-PMH source');
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Failed to create OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}
