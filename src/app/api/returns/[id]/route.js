import { proxy, errorResponse } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * /api/returns/:id — read, update, delete a single return.
 *
 * The id is taken from the route parameter and encoded before being placed in the backend
 * path, so it cannot be used to escape the intended route.
 */
const backendPath = (id) => `/api/returns/${encodeURIComponent(id)}`;

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    return await proxy(request, backendPath(id));
  } catch (err) { return errorResponse(err); }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    return await proxy(request, backendPath(id));
  } catch (err) { return errorResponse(err); }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    return await proxy(request, backendPath(id));
  } catch (err) { return errorResponse(err); }
}
