// This is a server component (no 'use client')
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function verifyUserToken(token) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  try {
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
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export default async function MyLayout({ children }) {
  // Get the token from cookies
  const cookieStore = await cookies();
  
  // Check for auth_token
  let token = cookieStore.get('auth_token')?.value;
  
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