import { callBackend, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/teller/enrollment
 *
 * Receives the result of a Teller Connect enrollment and hands it to the backend.
 *
 * This is the one path where an access token legitimately travels browser -> server, because
 * Teller Connect produces it in the browser. It goes straight through to the backend and is
 * never stored, logged, or echoed back here.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json(
      await callBackend('/api/teller/enrollment', { method: 'POST', body })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
