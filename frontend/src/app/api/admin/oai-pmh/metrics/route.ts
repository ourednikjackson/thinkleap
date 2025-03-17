// API route for OAI-PMH harvest metrics
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Get OAI-PMH harvest metrics
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oai-pmh/metrics`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch OAI-PMH metrics');
    }

    const metrics = await response.json();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching OAI-PMH metrics:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH metrics', error: String(error) },
      { status: 500 }
    );
  }
}
