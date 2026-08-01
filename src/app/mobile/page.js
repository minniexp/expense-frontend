import { redirect } from 'next/navigation';
import MobileReviewClient from '@/components/MobileReviewClient';
import { fetchMongoDBTransactionsServer } from '@/lib/serverApi';
import { getSessionToken, callBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/**
 * The phone-shaped view of the ledger, at /mobile.
 *
 * Same data as /my, different shape: /my is a nineteen-column grid built for a mouse. This exists
 * so a new transaction can be categorised from a phone without pinch-zooming into a table cell.
 *
 * Trip links are resolved here rather than in the browser. The client would otherwise need a second
 * round trip before it could show whether a row belongs to a trip, and a badge that appears a moment
 * after everything else reads as a glitch.
 */
export default async function MobileReviewPage() {
  const token = await getSessionToken();
  if (!token) redirect('/');

  let transactions = [];
  let returns = [];
  let tripLinks = [];

  try {
    transactions = (await fetchMongoDBTransactionsServer()) || [];
  } catch (error) {
    console.error('Failed to load transactions', error);
    redirect('/');
  }

  try {
    returns = (await callBackend('/api/returns')) || [];
  } catch (error) {
    // A missing returns list costs one dropdown, not the page.
    console.error('Failed to load returns', error);
  }

  try {
    const ids = transactions.map((t) => t.tellerTransactionId).filter(Boolean);
    if (ids.length) {
      tripLinks = (await callBackend('/api/trips/transaction-links', {
        method: 'POST',
        body: { tellerTransactionIds: ids },
      })) || [];
    }
  } catch (error) {
    // Same reasoning: no trip badges is a worse page, not a broken one.
    console.error('Failed to resolve trip links', error);
  }

  // The trip list for the Trips tab. Fetched here for the same reason as everything else on this
  // page: one request on first paint beats a spinner the moment the tab is tapped.
  let trips = [];
  try {
    trips = (await callBackend('/api/trips')) || [];
  } catch (error) {
    console.error('Failed to load trips', error);
  }

  // The spending overview. Computed on the server because `accumulated` needs every transaction
  // since January and the arithmetic is unit-tested there.
  let summary = null;
  let budgets = {};
  try {
    const now = new Date();
    summary = await callBackend(`/api/budgets/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    const doc = await callBackend('/api/budgets');
    budgets = (doc && doc.monthly) || {};
  } catch (error) {
    console.error('Failed to build the spending overview', error);
  }

  return (
    <MobileReviewClient
      initialTransactions={transactions}
      initialReturns={returns}
      tripLinks={tripLinks}
      initialSummary={summary}
      initialBudgets={budgets}
      initialTrips={trips}
    />
  );
}
