import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ReviewPageClient from '@/components/ReviewPageClient';
import { fetchMongoDBTransactionsServer } from '@/services/api';

export default async function ReviewPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // Get the token from cookies for API requests
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    redirect('/');
  }

  // Fetch initial data on the server
  let initialTransactions = [];
  let initialReturns = [];
  
  try {
    // Use the server-side function with the token
    initialTransactions = await fetchMongoDBTransactionsServer(token);
    
    // Similarly fetch returns if needed
    // initialReturns = await fetchReturnsServer(token);
  } catch (error) {
    console.error('Failed to fetch required data', error);
  }

  const fetchAvailableReturns = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/returns`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch returns: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching returns:', error);
      return null;
    }
  };

  try {
    // Fetch data in parallel for better performance
    const [returnsData] = await Promise.all([
      fetchAvailableReturns()
    ]);
    
    // Check if either request failed
    if (!initialTransactions || !returnsData) {
      console.error('Failed to fetch required data');
      // If the API calls failed, redirect to the home page
      redirect('/');
    }

  return (
      <ReviewPageClient 
        initialTransactions={initialTransactions} 
        initialReturns={returnsData}
      />
    );
  } catch (error) {
    console.error('Error rendering page:', error);
    redirect('/');
  }
}
