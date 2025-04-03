import { NextResponse } from 'next/server';

// Define routes that require advanced access
const advancedRoutes = ['/my', '/return', '/add', '/navigation', '/teller', '/test'];

// Define routes that can be accessed by both simple and advanced users
const protectedRoutes = ['/user', ...advancedRoutes];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Don't run middleware for the home page or API routes
  if (pathname === '/' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  console.log(`Middleware running for path: ${pathname}`);

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdvancedRoute = advancedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Get auth token from cookies - check both possible tokens
    let token = request.cookies.get('auth_token')?.value;
    let sessionToken = request.cookies.get('next-auth.session-token')?.value;
    
    console.log(`Cookie check for ${pathname}:`, {
      hasAuthToken: !!token,
      hasSessionToken: !!sessionToken
    });

    // If we have no token but have a session token, try to use that
    if (!token && sessionToken) {
      // Log this scenario clearly for debugging
      console.log("Found NextAuth session token but no auth_token");
      
      // Set the auth_token cookie for future requests
      const response = NextResponse.next();
      response.cookies.set('auth_token', sessionToken, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      console.log("Set auth_token cookie from session token");
      return response;
    }

    // If no token, redirect to login
    if (!token) {
      console.log(`No auth tokens found, redirecting from ${pathname} to /`);
      return NextResponse.redirect(new URL('/?no_auth=true', request.url));
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://expense-backend-rose.vercel.app';
    

    if (isAdvancedRoute) {
      try {
        // For advanced routes, verify the user has advanced access
        const response = await fetch(`${backendUrl}/api/users/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token }),
          cache: 'no-store',
        });

        if (!response.ok) {
          return NextResponse.redirect(new URL('/', request.url));
        }

        const data = await response.json();

        // Check if user has advanced access
        if (data.accessLevel !== 'advanced') {
          return NextResponse.redirect(new URL('/auth/error?error=unauthorized', request.url));
        }
      } catch (error) {
        console.error('Error in middleware:', error);
        return NextResponse.redirect(new URL('/', request.url));
      }
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
    '/test/:path*',
  ],
}; 