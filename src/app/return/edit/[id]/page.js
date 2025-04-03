import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ReturnEditClient from '@/components/ReturnEditClient';
import { fetchReturnServer, fetchTransactionsByIdsServer } from '@/services/api';

export default async function EditReturnPage({ params }) {
  // Server-side authentication check
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  const returnId = params.id;
  
  // Fetch return data on the server
  let returnData = null;
  let transactions = [];
  
  try {
    // Fetch the return document
    returnData = await fetchReturnServer(returnId, token);
    
    // If we have transaction IDs, fetch the associated transactions
    if (returnData.returnedTransactionIds && returnData.returnedTransactionIds.length > 0) {
      transactions = await fetchTransactionsByIdsServer(returnData.returnedTransactionIds, token);
    }
  } catch (error) {
    console.error('Error fetching return data:', error);
    // We'll let the client component handle the error display
  }
  
  // Render the client component with initial data
  return (
    <ReturnEditClient 
      returnId={returnId} 
      initialReturnData={returnData} 
      initialTransactions={transactions} 
    />
  );
} 