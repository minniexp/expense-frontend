import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * Server-side gateway to the Express backend.
 *
 * SECURITY MODEL — this file is the whole point of the proxy.
 *
 * The browser never talks to the Express backend for Teller data, and never holds a backend
 * session token in JavaScript. Instead:
 *
 *   browser  --(httpOnly NextAuth cookie)-->  Next.js route handler (this server)
 *            --(session JWT + INTERNAL_API_SECRET)-->  Express backend  -->  Teller
 *
 * Two things follow from that:
 *
 *   1. `INTERNAL_API_SECRET` lives only here. It has no `NEXT_PUBLIC_` prefix, so Next will
 *      never inline it into a client bundle. If it ever appears in browser-visible code, that
 *      is a bug — the backend's Teller route requires it, so leaking it would remove one of
 *      the two independent controls guarding live bank data.
 *
 *   2. The session token is read from the httpOnly NextAuth cookie on the server. It is never
 *      written to `document.cookie` and never returned to the browser, so cross-site scripting
 *      cannot exfiltrate it.
 *
 * Never import this from a Client Component.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export class BackendError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function requireInternalSecret() {
  const secret = process.env.INTERNAL_API_SECRET;
  // Fail closed and say why. A missing secret must never silently degrade to an unauthenticated
  // call — that is the failure mode this whole change exists to remove.
  if (!secret || secret.length < 32) {
    throw new BackendError(
      'INTERNAL_API_SECRET is not configured on the server (needs >= 32 characters)',
      503
    );
  }
  return secret;
}

/**
 * Call the Express backend on behalf of the signed-in user.
 *
 * @param {string} path e.g. "/api/teller/transactions?days=90"
 * @param {object} [options] fetch-style options; `body` is JSON-encoded if an object
 * @param {object} [options.session] a session already resolved by the caller
 * @returns {Promise<any>} parsed JSON
 * @throws {BackendError} with an HTTP status suitable for returning to the browser
 */
export async function callBackend(path, options = {}) {
  if (!BACKEND_URL) throw new BackendError('Backend URL is not configured', 503);

  const session = options.session || await getServerSession(authOptions);
  const accessToken = session && session.accessToken;
  if (!accessToken) throw new BackendError('Not signed in', 401);

  const secret = requireInternalSecret();

  const { method = 'GET', body, session: _ignored, ...rest } = options;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Internal-Secret': secret,
      ...(options.headers || {}),
    },
    body: body === undefined ? undefined
      : (typeof body === 'string' ? body : JSON.stringify(body)),
    cache: 'no-store',
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body from the backend is a server problem, not something to hand to the
    // browser verbatim — it could be an HTML error page carrying internal detail.
    throw new BackendError(`Backend returned a non-JSON response (HTTP ${res.status})`, 502);
  }

  if (!res.ok) {
    throw new BackendError(
      (data && (data.error || data.message)) || `Backend error (HTTP ${res.status})`,
      res.status
    );
  }

  return data;
}

/** Turn a BackendError into a Response, without leaking internals on unexpected failures. */
export function errorResponse(err) {
  const status = err instanceof BackendError ? err.status : 500;
  const message = err instanceof BackendError ? err.message : 'Internal server error';
  if (!(err instanceof BackendError)) console.error('Proxy error:', err);
  return Response.json({ error: message }, { status });
}
