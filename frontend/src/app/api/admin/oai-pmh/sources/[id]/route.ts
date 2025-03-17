// API route for managing a specific OAI-PMH source
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Retrieve a specific OAI-PMH source
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources/${id}`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'OAI-PMH source not found' },
          { status: 404 }
        );
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch OAI-PMH source');
    }

    const source = await response.json();
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error fetching OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}

// Update a specific OAI-PMH source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.oai_endpoint || !body.metadata_prefix) {
      return NextResponse.json(
        { message: 'Name, OAI endpoint, and metadata prefix are required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        name: body.name,
        oai_endpoint: body.oai_endpoint,
        metadata_prefix: body.metadata_prefix,
        set_spec: body.set_spec || null,
        harvest_interval_hours: body.harvest_interval_hours || 24,
        is_active: body.is_active !== undefined ? body.is_active : true
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'OAI-PMH source not found' },
          { status: 404 }
        );
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to update OAI-PMH source');
    }

    const updatedSource = await response.json();
    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error('Error updating OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Error updating OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}

// Delete a specific OAI-PMH source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/sources/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'OAI-PMH source not found' },
          { status: 404 }
        );
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete OAI-PMH source');
    }

    return NextResponse.json({ message: 'OAI-PMH source deleted successfully' });
  } catch (error) {
    console.error('Error deleting OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Error deleting OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}
