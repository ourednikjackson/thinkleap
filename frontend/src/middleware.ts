// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, isAuthRoute, routes } from '@/config/routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Determine route type
  const isPublicPath = isPublicRoute(pathname);
  const isAuthPath = isAuthRoute(pathname);
 
  // Get the token from cookie
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const isAuthenticated = !!refreshToken;
  
  // Debug logs
  console.log(`Middleware running on path: ${pathname}`);
  console.log(`Auth token present: ${isAuthenticated}`);
  console.log(`Is public path: ${isPublicPath}`);
  console.log(`Is auth route: ${isAuthPath}`);
  
  // Apply security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'same-origin');

  // Redirect logic
  if (isAuthenticated) {
    // Authenticated users trying to access auth pages (login/signup) should be redirected to dashboard
    if (isAuthPath) {
      console.log(`Redirecting authenticated user from auth route to dashboard`);
      return NextResponse.redirect(new URL(routes.dashboard, request.url));
    }
    
    // Authenticated users can access any non-auth route
    return response;
  } else {
    // Unauthenticated users can access public paths (including auth paths)
    if (isPublicPath) {
      return response;
    }
    
    // Redirect unauthenticated users trying to access protected routes
    console.log(`Redirecting unauthenticated user to login`);
    const loginUrl = new URL(routes.login, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * 
     * Note: We're allowing middleware to run on API routes so it can 
     * access cookies on all routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};