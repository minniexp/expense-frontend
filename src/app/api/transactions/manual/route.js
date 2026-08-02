import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** POST /api/transactions/manual — a transaction typed in by hand. */
export async function POST(request) {
  try { return await proxy(request, '/api/transactions/manual'); }
  catch (err) { return errorResponse(err); }
}
