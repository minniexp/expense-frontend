import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PayeeSummary from '@/components/PayeeSummary';

export default async function NavigationPage() {
  // Server-side authentication check
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  // Middleware already handles the advanced access level check,
  // but you could add additional server-side logic here if needed
  
  // Render the client component with navigation links
  return <PayeeSummary />;
}
