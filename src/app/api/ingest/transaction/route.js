import { callBackendAsService, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/transaction
 *
 * The public entry point for adding a transaction from outside the web UI — an iOS Shortcut,
 * today. This is the only route in the app that accepts a credential other than a session, so
 * it is deliberately the narrowest one: it forwards a single POST to a create-only backend
 * endpoint and does nothing else.
 *
 *   curl -X POST https://<site>/api/ingest/transaction \
 *     -H 'Authorization: Bearer <INGEST_TOKEN>' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"amount":37.57,"description":"Zelle payment from ...","date":"2026-07-25","notes":"gas"}'
 *
 * The token is validated by the BACKEND, not here — one place to check rather than two copies
 * that can drift. This layer only attaches the internal secret, which never leaves the server.
 */
export async function POST(request) {
  try {
    const auth = request.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!bearer) {
      return Response.json(
        { error: 'Missing Authorization: Bearer <token>' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (body === null) {
      return Response.json({ error: 'Body must be valid JSON' }, { status: 400 });
    }

    const data = await callBackendAsService('/api/ingest/transaction', { body, bearer });
    return Response.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
