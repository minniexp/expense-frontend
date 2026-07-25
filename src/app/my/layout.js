// This is a server component (no 'use client')
import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/backend';

async function verifyUserToken(token) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  try {
    // Server component: call the backend directly. A relative URL cannot be fetched from
    // Node, and this side can hold the internal secret that /api/users/* now requires.
    const response = await fetch(`${backendUrl}/api/users/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export default async function MyLayout({ children }) {
  // Session comes from the httpOnly NextAuth cookie, resolved server-side.
  const token = await getSessionToken();
  
  // If no token, redirect to sign in
  if (!token) {
    redirect('/');
  }

  // Verify the token and get user data
  const userData = await verifyUserToken(token);
  
  // If token is invalid or verification failed, redirect to sign in
  if (!userData || !userData.user) {
    redirect('/');
  }
  
  // Check if user has advanced access
  if (userData.accessLevel !== 'advanced') {
    redirect('/auth/error?error=unauthorized');
  }

  // If validation passes, render the children
  return (
    <div className="bg-gray-900 min-h-screen">
      {children}
    </div>
  );
} 