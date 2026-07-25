import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/backend';
import TripDetailClient from '@/components/TripDetailClient';

export default async function TripDetailPage({ params }) {
  const token = await getSessionToken();
  if (!token) redirect('/');
  const { id } = await params;
  return <TripDetailClient tripId={id} />;
}
