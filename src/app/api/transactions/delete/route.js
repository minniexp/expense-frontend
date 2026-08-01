import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transactions/delete — remove chosen rows.
 *
 * POST rather than DELETE because the ids travel in a body, which DELETE does not carry reliably.
 * The backend requires the advanced role on top of the session this proxy forwards, so a simple
 * account cannot reach it even though it can reach the rest of this router.
 */
export async function POST(request) {
  try { return await proxy(request, '/api/transactions/delete'); }
  catch (err) { return errorResponse(err); }
}
