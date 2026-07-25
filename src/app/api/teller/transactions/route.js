import { callBackend, errorResponse } from '@/lib/backend';

// Never prerender or cache: this reaches live bank data and is per-user.
export const dynamic = 'force-dynamic';

/**
 * GET /api/teller/transactions
 *
 * Server-side proxy to the Express backend's Teller sync.
 *
 * The browser reaches this route with nothing but its httpOnly NextAuth cookie. This handler
 * supplies the backend session token and the internal secret, neither of which is ever visible
 * to client-side JavaScript. That is what lets the deployed site fetch bank data without
 * putting a long-lived, JS-readable credential in the browser.
 *
 * Query parameters are forwarded, but only the ones the sync actually understands — an
 * allowlist rather than a blind pass-through, so this cannot be used to smuggle unexpected
 * parameters at the backend.
 */
const ALLOWED_PARAMS = ['days', 'since', 'all', 'format'];

export async function GET(request) {
  try {
    const incoming = new URL(request.url).searchParams;
    const forwarded = new URLSearchParams();
    for (const key of ALLOWED_PARAMS) {
      const value = incoming.get(key);
      if (value !== null) forwarded.set(key, value);
    }

    const qs = forwarded.toString();
    const data = await callBackend(`/api/teller/transactions${qs ? `?${qs}` : ''}`);
    return Response.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
