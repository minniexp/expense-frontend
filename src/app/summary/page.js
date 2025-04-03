import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PayeeSummary from '@/components/PayeeSummary';

export default async function NavigationPage() {
    console.log("summary page loading")
  // Server-side authentication check
  const cookieStore = await cookies();
  console.log("cookieStore", cookieStore)
  const token = cookieStore.get('next-auth.session-token')?.value;
  console.log("summary page token", token)
  if (!token) {
    // User not authenticated, redirect to login
    redirect('/');
  }

  // Middleware already handles the advanced access level check,
  // but you could add additional server-side logic here if needed
  
  // Render the client component with navigation links
  return <PayeeSummary />;
}
