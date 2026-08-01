import { callBackend, errorResponse, BackendError } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * Proxy for budgets and the spending summary.
 *
 * Optional catch-all so `/api/budgets` itself works alongside `/api/budgets/summary`; a plain
 * `[...path]` matches only sub-paths and would 404 the bare route while the nested one worked.
 * Segments are validated so this can only ever reach `/api/budgets/...` on the backend.
 */
function backendPath(segments) {
  const parts = (segments || []).map(String);
  for (const p of parts) {
    if (p === '..' || p === '.' || p === '' || p.includes('/') || p.includes('\\')) {
      throw new BackendError('Invalid path', 400);
    }
  }
  return `/api/budgets${parts.length ? '/' + parts.map(encodeURIComponent).join('/') : ''}`;
}

async function forward(request, ctx, method) {
  try {
    const { path } = await ctx.params;
    const search = new URL(request.url).search;
    const body = method === 'GET' ? undefined : await request.json().catch(() => undefined);
    const data = await callBackend(`${backendPath(path)}${search}`, { method, body });
    return Response.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export const GET = (req, ctx) => forward(req, ctx, 'GET');
export const PUT = (req, ctx) => forward(req, ctx, 'PUT');
