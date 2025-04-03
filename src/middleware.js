import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Define routes that require advanced access
const advancedRoutes = ['/my', '/return', '/add', '/navigation', '/teller', '/test'];

// Define routes that can be accessed by both simple and advanced users
const protectedRoutes = ['/user', ...advancedRoutes];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdvancedRoute = advancedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Get auth token from cookies - check both possible tokens
    let token = request.cookies.get('auth_token')?.value;

    // Also try next-auth session token
    if (!token) {
      const sessionToken = request.cookies.get('next-auth.session-token')?.value;
      if (sessionToken) {
        token = sessionToken
        Cookies.set('auth_token', sessionToken)
        // If you have access to the session token but not the auth_token,
        // you might need session decoding logic here or redirect to a page
        // that can set the auth_token properly
        console.log("Found session token but no auth_token");
        console.log("next-auth.session-token", sessionToken)
      }
    }

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
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

  console.log("Middleware complete");

  // Continue with the request
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