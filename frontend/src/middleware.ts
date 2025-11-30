import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes
const protectedRoutes = [
  '/focus',
  '/history',
  '/graph',
  '/lounge',
  '/feedback',
];

export function middleware(request: NextRequest) {
  // Get the session cookie
  const sessionCookie = request.cookies.get('session');

  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If it's a protected route and there's no session cookie, redirect to the homepage
  if (isProtectedRoute && !sessionCookie) {
    const absoluteUrl = new URL('/', request.url);
    absoluteUrl.searchParams.set('message', 'login_required'); // Add query parameter
    return NextResponse.redirect(absoluteUrl.toString());
  }

  // If the user is logged in (has a session cookie) and tries to access a non-existent page or similar,
  // let the request proceed to be handled by Next.js (which will show a 404 page).
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
