import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/returns/:id/confirmation
 *
 * Flips the payback confirmation flags on a return. A dedicated sub-route because the
 * `[id]` handler only matches the bare document path, and because this deliberately does NOT
 * accept a whole document — only { payee, lender } booleans reach the backend.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    return await proxy(request, `/api/returns/${encodeURIComponent(id)}/confirmation`);
  } catch (err) {
    return errorResponse(err);
  }
}
