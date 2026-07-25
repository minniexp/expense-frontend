import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** POST /api/transactions/by-ids — fetch a specific set of transactions. */
export async function POST(request) {
  try { return await proxy(request, '/api/transactions/by-ids'); }
  catch (err) { return errorResponse(err); }
}
