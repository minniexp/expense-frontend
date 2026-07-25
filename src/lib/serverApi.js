import { callBackend } from '@/lib/backend';

/**
 * Data helpers for Server Components.
 *
 * These used to live in `src/services/api.js` and take a `token` argument that the caller read
 * out of an `auth_token` cookie. Two problems with that, both now fixed:
 *
 *   1. `services/api.js` is imported by Client Components, so anything in it is reachable from
 *      the browser bundle. Server-only logic does not belong there.
 *   2. The token came from a cookie that JavaScript could read, which is exactly the exposure
 *      the proxy work removes.
 *
 * These take no token. `callBackend` resolves the session server-side from the httpOnly cookie
 * and attaches the internal secret.
 *
 * Never import this from a Client Component.
 */

export async function fetchReturnsServer() {
  return callBackend('/api/returns');
}

export async function fetchReturnServer(id) {
  return callBackend(`/api/returns/${encodeURIComponent(id)}`);
}

export async function fetchTransactionsByIdsServer(ids) {
  return callBackend('/api/transactions/by-ids', { method: 'POST', body: { ids } });
}

export async function fetchMongoDBTransactionsServer() {
  return callBackend('/api/transactions');
}
