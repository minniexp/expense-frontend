import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define routes that require advanced access
const advancedRoutes = ['/my', '/mobile', '/return', '/add', '/navigation', '/teller', '/test', '/trips'];

// Define routes that can be accessed by both simple and advanced users
const protectedRoutes = ['/user', '/summary', ...advancedRoutes];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Add strict protected routes check
  const isProtectedRoute = !pathname.startsWith('/auth/') && 
                          pathname !== '/' && 
                          !pathname.includes('_next') &&
                          !pathname.includes('api/auth');

  if (isProtectedRoute) {
    // The backend session token now lives inside the httpOnly NextAuth session, decoded here
    // with NEXTAUTH_SECRET. The old `auth_token` cookie is gone — it was readable by any
    // script on the page, so an XSS could lift a working API credential straight out of it.
    const nextAuthToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token', // must match the custom name in authOptions
    });

    const token = nextAuthToken?.accessToken;

    if (!token) {
      console.log(`No session found, redirecting from ${pathname} to /`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    try {
      // Middleware runs on the server, so it can hold the internal secret. /api/users/* now
      // requires it — that endpoint family mints and validates sessions and must not be
      // reachable from the open internet.
      const internalSecret = process.env.INTERNAL_API_SECRET;
      if (!internalSecret) {
        console.error('INTERNAL_API_SECRET is not set — cannot verify session');
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Always verify token for protected routes
      const response = await fetch(`${backendUrl}/api/users/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Internal-Secret': internalSecret,
        },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('Token verification failed:', response.status);
        return NextResponse.redirect(new URL('/', request.url));
      }

      const data = await response.json();
      
      // Verify user exists and is approved
      if (!data.user || !data.user.isApproved) {
        return NextResponse.redirect(new URL('/auth/error?error=not_approved', request.url));
      }

      // Additional check for advanced routes
      const isAdvancedRoute = advancedRoutes.some(route => pathname.startsWith(route));
      if (isAdvancedRoute && data.accessLevel !== 'advanced') {
        return NextResponse.redirect(new URL('/auth/error?error=unauthorized', request.url));
      }

    } catch (error) {
      console.error('Error in middleware:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  console.log("Middleware complete for", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/user/:path*',
    '/my/:path*',
    '/return/:path*',
    '/add/:path*',
    '/navigation/:path*',
    '/teller/:path*',
    '/trips/:path*',
    '/test/:path*',
    '/summary/:path*',
  ],
}; 