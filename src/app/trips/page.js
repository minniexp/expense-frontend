import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/backend';
import TripsListClient from '@/components/TripsListClient';

export default async function TripsPage() {
  // Same session gate as the other protected pages, from the httpOnly cookie.
  const token = await getSessionToken();
  if (!token) redirect('/');
  return <TripsListClient />;
}
