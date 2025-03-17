import { clerkMiddleware } from '@clerk/nextjs/server';

// Use Clerk middleware to protect routes
export default clerkMiddleware()


export const config = {
  publicRoutes: [
    '/',
    '/sign-in*',
    '/sign-up*',
    '/api/search*', // Allow public access to search API for JSTOR integration
  ],
  ignoredRoutes: [
    '/_next/*',
    '/favicon.ico',
    '/api/webhooks*',
  ],
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Optional: Protect all routes starting with /api
    '/(api|trpc)(.*)',
  ],
};
