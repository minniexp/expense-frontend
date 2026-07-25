import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * /api/transactions — list and bulk-create.
 *
 * Proxied so the browser never holds a backend credential. Note what is deliberately absent:
 * DELETE. The backend exposes DELETE /api/transactions/all, which wipes the ledger; no UI uses
 * it, and not proxying it means a browser cannot reach it at all.
 */
export async function GET(request) {
  try { return await proxy(request, '/api/transactions'); }
  catch (err) { return errorResponse(err); }
}

export async function POST(request) {
  try { return await proxy(request, '/api/transactions', { successStatus: 201 }); }
  catch (err) { return errorResponse(err); }
}
