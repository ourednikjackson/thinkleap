import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear the auth cookie
    cookies().delete('refreshToken');
    console.log('Server-side cookie cleared: refreshToken');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing auth cookie:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}