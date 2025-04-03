import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ReturnManagementClient from '@/components/ReturnManagementClient';

export default async function ReturnPage() {
  // Server-side authentication check
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  // Fetch initial returns data on the server
  let initialReturns = [];
  
  try {
    // Use built-in fetch to make server-side API call
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch returns data:', response.status, response.statusText);
    } else {
      initialReturns = await response.json();
    }
  } catch (error) {
    console.error('Error fetching initial returns data:', error);
    // Continue with empty returns array
  }
  
  // Render the client component with initial data
  return <ReturnManagementClient initialReturns={initialReturns} />;
}
