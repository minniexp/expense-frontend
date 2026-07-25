import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * /api/returns — list and create.
 *
 * POST /api/returns/migrate-transaction-ids is intentionally NOT proxied: it is a one-off
 * migration with no UI caller, so the browser has no route to it.
 */
export async function GET(request) {
  try { return await proxy(request, '/api/returns'); }
  catch (err) { return errorResponse(err); }
}

export async function POST(request) {
  try { return await proxy(request, '/api/returns', { successStatus: 201 }); }
  catch (err) { return errorResponse(err); }
}
