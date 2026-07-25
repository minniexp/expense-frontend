import { callBackend, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** GET /api/teller/ignored — list dismissed transactions. */
export async function GET() {
  try {
    return Response.json(await callBackend('/api/teller/ignored'));
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/teller/ignored — dismiss transactions so future fetches filter them out. */
export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json(
      await callBackend('/api/teller/ignored', { method: 'POST', body }),
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
