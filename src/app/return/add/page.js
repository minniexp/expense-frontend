import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AddReturnClient from '@/components/AddReturnClient';

export default async function AddReturnPage() {
  // Server-side authentication check
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }
  
  // Render the client component
  return <AddReturnClient />;
}
