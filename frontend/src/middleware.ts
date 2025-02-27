// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, isAuthRoute, routes } from '@/config/routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Check if this is a public path
  const isPublicPath = isPublicRoute(pathname);
 
  // Get the token from cookie
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const isAuthenticated = !!refreshToken;
  
  // Apply security headers
  const response = NextResponse.next();
  
  // Apply security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'same-origin');

  
  // Conditional redirects based on auth state
  if (isAuthenticated && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL(routes.dashboard, request.url));
  }
  
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL(routes.login, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return response;
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};