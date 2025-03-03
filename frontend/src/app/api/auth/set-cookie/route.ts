import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Set HTTP-only cookie that will be accessible by the server
    cookies().set({
      name: 'refreshToken',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      // Use a long expiration time (e.g., 30 days)
      maxAge: 30 * 24 * 60 * 60
    });
    
    console.log('Server-side cookie set: refreshToken');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}