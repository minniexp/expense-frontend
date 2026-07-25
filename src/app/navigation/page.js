import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NavigationLinks from '@/components/NavigationLinks';
import { getSessionToken } from '@/lib/backend';

export default async function NavigationPage() {
  // Server-side authentication check
  const cookieStore = cookies();
  const token = await getSessionToken();
  
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  // Middleware already handles the advanced access level check,
  // but you could add additional server-side logic here if needed
  
  // Render the client component with navigation links
  return <NavigationLinks />;
}
