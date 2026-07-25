import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** POST /api/transactions/single — create one transaction. */
export async function POST(request) {
  try { return await proxy(request, '/api/transactions/single', { successStatus: 201 }); }
  catch (err) { return errorResponse(err); }
}
