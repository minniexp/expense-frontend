import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** PUT /api/transactions/update-many — bulk edit. */
export async function PUT(request) {
  try { return await proxy(request, '/api/transactions/update-many'); }
  catch (err) { return errorResponse(err); }
}
