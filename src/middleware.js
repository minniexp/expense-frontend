import { NextResponse } from 'next/server';

// Define routes that require advanced access
const advancedRoutes = ['/my', '/return', '/add', '/navigation', '/teller', '/test'];

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
    // Get auth token from cookies - check both possible tokens
    let token = request.cookies.get('auth_token')?.value;
    let sessionToken = request.cookies.get('next-auth.session-token')?.value;

    if (!token && !sessionToken) {
      console.log(`No auth tokens found, redirecting from ${pathname} to /`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    try {
      // Always verify token for protected routes
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
    '/test/:path*',
    '/summary/:path*',
  ],
}; 