import { callBackend, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** POST /api/teller/ignored/restore — put dismissed transactions back in the review queue. */
export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json(
      await callBackend('/api/teller/ignored/restore', { method: 'POST', body })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
