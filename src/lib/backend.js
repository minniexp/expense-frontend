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
  constructor(message, status, details) {
    super(message);
    this.status = status;
    // Per-item validation errors from the backend, when it sent any. See errorResponse().
    if (details !== undefined) this.details = details;
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
      res.status,
      backendErrorDetails(data)
    );
  }

  return data;
}

/**
 * The signed-in user's backend session token, read server-side from the httpOnly cookie.
 *
 * Server Components use this instead of reading an `auth_token` cookie, which no longer
 * exists — it was readable by any script on the page, which made it stealable via XSS.
 */
export async function getSessionToken() {
  const session = await getServerSession(authOptions);
  return (session && session.accessToken) || null;
}

/**
 * Forward a Route Handler request to the backend.
 *
 * One place where every proxied call gets the session token and the internal secret attached,
 * so no individual route can forget one.
 *
 * @param {Request} request the incoming Route Handler request
 * @param {string} backendPath path on the Express backend
 * @param {object} [opts]
 * @param {boolean} [opts.forwardBody] read and forward the JSON body (default: true for
 *        methods that carry one)
 * @param {number} [opts.successStatus] status to return on success
 */
export async function proxy(request, backendPath, opts = {}) {
  const method = request.method;
  const carriesBody = !['GET', 'DELETE', 'HEAD'].includes(method);
  const { forwardBody = carriesBody, successStatus } = opts;

  let body;
  if (forwardBody) {
    body = await request.json().catch(() => undefined);
  }

  const data = await callBackend(backendPath, { method, body });
  return Response.json(data, successStatus ? { status: successStatus } : undefined);
}

/**
 * Call the backend WITHOUT a user session, forwarding a caller-supplied credential instead.
 *
 * Only for the ingest path. `callBackend()` resolves a NextAuth session and 401s without one,
 * which is right for everything a browser does — but a phone posting a transaction has no
 * session and should not be given one. It presents its own narrow, create-only token, which
 * this forwards alongside the internal secret so the backend can validate both.
 *
 * The internal secret still never leaves the server.
 */
export async function callBackendAsService(path, { method = 'POST', body, bearer } = {}) {
  if (!BACKEND_URL) throw new BackendError('Backend URL is not configured', 503);
  const secret = requireInternalSecret();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new BackendError(`Backend returned a non-JSON response (HTTP ${res.status})`, 502);
  }
  if (!res.ok) {
    throw new BackendError(
      (data && (data.error || data.message)) || `Backend error (HTTP ${res.status})`,
      res.status,
      backendErrorDetails(data)
    );
  }
  return data;
}

/**
 * The backend's per-item validation errors, if it sent any.
 *
 * These are written for whoever sent the request — "Unknown card ...8923 — add it to
 * CARD_LAST4_MAP" says exactly what to fix. Collapsing them to the envelope's "Nothing was saved."
 * leaves a phone with a failure and no way to act on it, which matters now that a bank alert is the
 * only record of a transaction: an unexplained rejection is a missing expense.
 *
 * Deliberately narrow. Only this one known-shaped field crosses back; everything else the backend
 * says stays server-side, for the same reason a non-JSON body is never forwarded verbatim.
 */
function backendErrorDetails(data) {
  if (!data || !Array.isArray(data.errors)) return undefined;
  return data.errors
    .filter((e) => e && typeof e.message === 'string')
    .map((e) => ({ index: e.index, message: e.message }));
}

/** Turn a BackendError into a Response, without leaking internals on unexpected failures. */
export function errorResponse(err) {
  const status = err instanceof BackendError ? err.status : 500;
  const message = err instanceof BackendError ? err.message : 'Internal server error';
  if (!(err instanceof BackendError)) console.error('Proxy error:', err);

  const details = err instanceof BackendError && Array.isArray(err.details) && err.details.length
    ? err.details
    : null;

  return Response.json(details ? { error: message, errors: details } : { error: message }, { status });
}
