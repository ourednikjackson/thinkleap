// API route for resetting user preferences
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Proxy to backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/preferences/reset`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Failed to reset preferences' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: 'Error resetting preferences' },
      { status: 500 }
    );
  }
}