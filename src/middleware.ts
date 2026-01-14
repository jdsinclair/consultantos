import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/debug(.*)',
]);

export default clerkMiddleware((auth, request) => {
  const { userId } = auth();
  
  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  
  // For protected routes, check if user is authenticated
  if (!userId) {
    // For API routes, return 401 JSON instead of redirect
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', reason: 'No session' },
        { status: 401 }
      );
    }
    // For pages, redirect to sign-in
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
