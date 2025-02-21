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

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL(routes.dashboard, request.url));
  }

  // If not authenticated and trying to access protected routes
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL(routes.login, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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