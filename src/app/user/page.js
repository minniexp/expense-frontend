import { cookies } from 'next/headers';
import UserDashboardClient from '@/components/UserDashboardClient';
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

export default async function UserDashboardPage() {
  // Get the token from cookies using the new pattern
  const cookieStore = await cookies();
  // FIX: Check for auth_token first, then fall back to next-auth session token
  let token = cookieStore.get('auth_token')?.value;
  
  // If auth_token is not found, try next-auth.session-token
  if (!token) {
    token = cookieStore.get('next-auth.session-token')?.value;
  }

  // If no token at all, redirect to sign in
  if (!token) {
    redirect('/');
  }

  // Verify the token and get user data
  const userData = await verifyUserToken(token);
  
  // If token is invalid or verification failed, redirect to sign in
  if (!userData || !userData.user) {
    redirect('/');
  }

  // If verification is successful, render the dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <UserDashboardClient user={userData.user} />
      </div>
    </div>
  );
}