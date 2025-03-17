import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export default authMiddleware({
  // Only run on admin routes
  publicRoutes: [],
  afterAuth(auth, req) {
    // If user is not authenticated, return 401
    if (!auth.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Continue with the request
    return NextResponse.next();
  },
});

export const config = {
  matcher: ['/(api/admin.*)'],
};
