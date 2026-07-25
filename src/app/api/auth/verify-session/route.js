import { errorResponse, BackendError, getSessionToken } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify-session
 *
 * Validates a session token on behalf of client components.
 *
 * `/api/users/*` on the backend now requires the internal secret, because that route family
 * mints session tokens and must not be reachable from the open internet. Client components
 * cannot hold that secret, so they come through here instead and this server attaches it.
 *
 * Note this endpoint only *reports* whether a token the caller already holds is valid — it
 * cannot mint anything. That is the important distinction from `/fetch-by-email`, which is
 * what actually had to be locked down.
 */
export async function POST(request) {
  try {
    // Client components no longer hold a token at all — the session lives in an httpOnly
    // cookie they cannot read. So resolve it here. An explicit token is still accepted for
    // callers that have one (the Next.js middleware).
    const body = await request.json().catch(() => ({}));
    const token = (typeof body.token === 'string' && body.token) || await getSessionToken();
    if (!token) {
      return Response.json({ error: 'No token provided' }, { status: 401 });
    }

    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || secret.length < 32) {
      throw new BackendError('INTERNAL_API_SECRET is not configured on the server', 503);
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}
