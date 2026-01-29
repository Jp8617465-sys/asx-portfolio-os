import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes requiring authentication.
 *
 * Checks for access_token in localStorage before allowing access to /app/* routes.
 * Redirects unauthenticated users to /login page.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const isProtectedRoute = pathname.startsWith('/app');

  if (isProtectedRoute) {
    // Note: Middleware runs on the server, so we can't access localStorage directly.
    // Instead, we check for the token in cookies (if using HttpOnly cookies)
    // or rely on the Authorization header.

    // For now, we'll use a cookie-based approach
    const token = request.cookies.get('access_token');

    if (!token) {
      // No token found - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists - allow request to proceed
    // Note: Token validation happens on the API side
    return NextResponse.next();
  }

  // Public routes - allow access
  return NextResponse.next();
}

/**
 * Configure which routes this middleware applies to.
 *
 * Matches all routes under /app/* (dashboard, portfolio, models, etc.)
 */
export const config = {
  matcher: [
    '/app/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
