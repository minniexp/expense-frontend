import { callBackend, errorResponse, BackendError } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * Catch-all proxy for the trip splitter API.
 *
 * The splitter has a dozen endpoints across members, trips, expenses, settlements and the
 * summary. Rather than a file per route, this forwards the whole subtree — the backend already
 * owns routing, validation and authorisation, so duplicating its route table here would just
 * be a second place to keep in sync.
 *
 * The session token and internal secret are attached by callBackend, so the browser still holds
 * no credential.
 *
 * Note the OPTIONAL catch-all `[[...path]]`. A plain `[...path]` matches only sub-paths, so
 * `/api/trips` itself — list and create — would fall through to a 404 while every nested route
 * worked, which is exactly the sort of half-working state that is easy to miss.
 */

/**
 * Rebuild the backend path from the route segments.
 *
 * Segments are validated rather than concatenated blindly: this proxy must only ever be able to
 * reach `/api/trips/...` on the backend. Without the check, a crafted segment could walk out of
 * the subtree and reach an unrelated endpoint through a route the browser is otherwise not
 * allowed to call.
 */
function backendPath(segments) {
  const parts = (segments || []).map(String);
  for (const p of parts) {
    if (p === '..' || p === '.' || p === '' || p.includes('/') || p.includes('\\')) {
      throw new BackendError('Invalid path', 400);
    }
  }
  return `/api/trips${parts.length ? '/' + parts.map(encodeURIComponent).join('/') : ''}`;
}

async function forward(request, ctx, method) {
  try {
    const { path } = await ctx.params;
    const search = new URL(request.url).search;
    const body = (method === 'GET' || method === 'DELETE')
      ? undefined
      : await request.json().catch(() => undefined);

    const data = await callBackend(`${backendPath(path)}${search}`, { method, body });
    return Response.json(data, method === 'POST' ? { status: 201 } : undefined);
  } catch (err) {
    return errorResponse(err);
  }
}

export const GET = (req, ctx) => forward(req, ctx, 'GET');
export const POST = (req, ctx) => forward(req, ctx, 'POST');
export const PUT = (req, ctx) => forward(req, ctx, 'PUT');
export const DELETE = (req, ctx) => forward(req, ctx, 'DELETE');
