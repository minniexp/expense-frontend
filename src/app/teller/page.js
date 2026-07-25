import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TellerTransactionsClient from '@/components/TellerTransactionsClient';
import axios from 'axios'; // Make sure axios is installed
import { getSessionToken } from '@/lib/backend';

export default async function TellerPage() {
  // Server-side authentication check - cookies() now needs to be awaited
  const cookieStore = await cookies();
  const token = await getSessionToken();
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  // Fetch initial teller transactions server-side
  let initialTransactions = [];

  // Render the client component with initial transactions data
  return <TellerTransactionsClient initialTransactions={initialTransactions} />;
}
