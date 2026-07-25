import { callBackend, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teller/enrollment-config
 *
 * Teller Connect widget configuration. Proxied because the backend's whole /api/teller surface
 * now requires the internal secret, which the browser must never hold.
 *
 * Note this deliberately returns only what the widget needs (application id, environment,
 * enrollment id). No access token is involved — the Teller access token lives solely in the
 * backend's environment and is never sent to a browser.
 */
export async function GET() {
  try {
    return Response.json(await callBackend('/api/teller/enrollment-config'));
  } catch (err) {
    return errorResponse(err);
  }
}
