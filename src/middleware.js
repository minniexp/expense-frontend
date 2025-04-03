import { NextResponse } from 'next/server';

// Define routes that require advanced access
const advancedRoutes = ['/my', '/return', '/add', '/navigation', '/teller', '/test'];

// Define routes that can be accessed by both simple and advanced users
const protectedRoutes = ['/user', ...advancedRoutes];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Don't run middleware for the home page to prevent loops
  if (pathname === '/') {
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

    // Also try next-auth session token
    if (!token && sessionToken) {
      token = sessionToken;
      
      // Set the auth_token cookie
      const response = NextResponse.next();
      response.cookies.set('auth_token', sessionToken, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
      });
      
      console.log("Setting auth_token from session token");
      return response;
    }

    // If no token, redirect to login
    if (!token) {
      // Add a query parameter to indicate why the redirect happened
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('redirect_reason', 'no_token');
      redirectUrl.searchParams.set('from', pathname);
      
      console.log(`No tokens found for ${pathname}, redirecting to /`);
      return NextResponse.redirect(redirectUrl);
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