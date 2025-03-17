// API route for managing OAI-PMH sources
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Retrieve all OAI-PMH sources
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('Connecting to API:', apiUrl);
    
    const response = await fetch(`${apiUrl}/oai-pmh/sources`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch OAI-PMH sources');
    }

    const sources = await response.json();
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching OAI-PMH sources:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH sources', error: String(error) },
      { status: 500 }
    );
  }
}

// Create a new OAI-PMH source
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
        { message: 'Name, OAI endpoint, and metadata prefix are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create OAI-PMH source');
    }

    const source = await response.json();
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Error creating OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}
