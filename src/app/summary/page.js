import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PayeeSummary from '@/components/PayeeSummary';

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

async function fetchReturnsServerSide(token) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  try {
    const response = await fetch(`${backendUrl}/api/returns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch returns:', response.status);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching returns:', error);
    return [];
  }
}

export default async function SummaryPage() {
  console.log("summary page loading");
  
  // Server-side authentication check
  const cookieStore = await cookies();
  
  let token = cookieStore.get('auth_token')?.value;
  if (!token) {
    token = cookieStore.get('next-auth.session-token')?.value;
  }
  
  if (!token) {
    console.log("No token found, redirecting to login");
    redirect('/');
  }

  // Verify the token
  const userData = await verifyUserToken(token);
  if (!userData || !userData.user) {
    console.log("Token verification failed, redirecting to login");
    redirect('/');
  }

  // Fetch returns server-side to bypass CORS
  const returnsData = await fetchReturnsServerSide(token);

  // Render the component with both user data and returns
  return <PayeeSummary userData={userData} returnsData={returnsData} />;
}
