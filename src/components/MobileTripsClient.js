'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchTripSummary } from '@/services/api';

/**
 * Trips, shaped for a phone.
 *
 * /trips and /trips/[id] are built for a mouse — a creation form up top, a detail page one tap
 * away. On a phone the thing actually wanted mid-trip is quicker: who owes what, right now,
 * without leaving the list. So this is cards that expand in place, same interaction as the
 * transaction list next door — tap the card, the balances and expenses unfold beneath it.
 *
 * Creating a trip or a member is still a desktop-shaped form (dates, a roster to manage) and
 * stays on /trips; this view is for checking in on one that already exists.
 */

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function TripCard({ trip, open, onToggle, detail, loading, error }) {
  const members = trip.memberIds || [];

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${
        trip.isFullySettled || trip.expenseCount === 0
          ? 'border-gray-800 bg-gray-800/40'
          : 'border-amber-500/40 bg-gray-800'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex gap-3 items-start active:bg-gray-700/50"
      >
        <div className="flex-1 min-w-0">
          <span className="font-semibold truncate block">{trip.name}</span>
          <div className="mt-1 text-sm text-gray-400">
            {trip.startDate || '—'}{trip.endDate ? ` → ${trip.endDate}` : ''}
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap items-center">
            {members.map((m) => (
              <span
                key={m._id}
                className="text-xs h-6 w-6 flex items-center justify-center rounded-full bg-gray-700 text-gray-200"
                title={m.name}
              >
                {initials(m.name)}
              </span>
            ))}
            {trip.expenseCount > 0 && (
              <span
                className={`text-xs px-2 py-1 rounded-lg ${
                  trip.isFullySettled
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-amber-500/20 text-amber-200'
                }`}
              >
                {trip.isFullySettled ? '✓ settled' : 'outstanding'}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold tabular-nums">{money(trip.total)}</div>
          <div className="text-xs text-gray-400">
            {trip.expenseCount} expense{trip.expenseCount === 1 ? '' : 's'}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-700 pt-4">
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {detail && (
            <>
              {/* Who stands where — the number that matters mid-trip. */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-gray-400">Balances</span>
                {detail.balances.map((b) => (
                  <div key={b.memberId} className="flex items-center justify-between text-[15px]">
                    <span className="truncate">{b.name}</span>
                    <span
                      className={`tabular-nums font-medium ${
                        b.net < -0.005 ? 'text-red-400' : b.net > 0.005 ? 'text-emerald-400' : 'text-gray-400'
                      }`}
                    >
                      {b.net < -0.005
                        ? `owes ${money(Math.abs(b.net))}`
                        : b.net > 0.005
                        ? `gets back ${money(b.net)}`
                        : 'settled up'}
                    </span>
                  </div>
                ))}
              </div>

              {/* The minimum set of payments that would zero everyone out. */}
              {detail.transfers.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-gray-400">Settle up</span>
                  {detail.transfers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[15px] bg-gray-900/60 rounded-xl px-3 py-2.5"
                    >
                      <span className="truncate">
                        <strong>{t.fromName}</strong> → <strong>{t.toName}</strong>
                      </span>
                      <span className="tabular-nums shrink-0">{money(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses, folded away — the balances are what mid-trip actually needs. */}
              {detail.expenses.length > 0 && (
                <details className="rounded-xl bg-gray-900/60 border border-gray-700">
                  <summary className="min-h-[44px] flex items-center px-4 text-[15px] text-gray-300 cursor-pointer">
                    {detail.expenses.length} expense{detail.expenses.length === 1 ? '' : 's'}
                  </summary>
                  <div className="p-4 pt-0 flex flex-col gap-3">
                    {detail.expenses.map((e) => (
                      <div key={e._id} className="flex items-center justify-between text-sm gap-2">
                        <div className="min-w-0">
                          <div className="truncate">{e.description}</div>
                          <div className="text-xs text-gray-500 tabular-nums">{e.date}</div>
                        </div>
                        <span className="tabular-nums shrink-0">{money(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function MobileTripsClient({ initialTrips }) {
  const [trips] = useState(initialTrips || []);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});   // tripId -> summary, fetched once and kept
  const [loadingId, setLoadingId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  async function toggle(tripId) {
    if (openId === tripId) {
      setOpenId(null);
      return;
    }
    setOpenId(tripId);
    if (details[tripId] || loadingId === tripId) return;

    setLoadingId(tripId);
    setErrorId(null);
    try {
      const summary = await fetchTripSummary(tripId);
      setDetails((prev) => ({ ...prev, [tripId]: summary }));
    } catch (err) {
      setErrorId(tripId);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Link
        href="/trips"
        className="min-h-[44px] rounded-xl bg-gray-800 border border-gray-700 text-[15px] font-medium flex items-center justify-center active:scale-[0.97] transition-transform"
      >
        + New trip / manage people
      </Link>

      {trips.length === 0 && (
        <p className="text-center text-gray-400 py-16">
          No trips yet. Create one from the link above.
        </p>
      )}

      {trips.map((t) => (
        <TripCard
          key={t._id}
          trip={t}
          open={openId === t._id}
          onToggle={() => toggle(t._id)}
          detail={details[t._id]}
          loading={loadingId === t._id}
          error={errorId === t._id ? 'Could not load this trip.' : null}
        />
      ))}
    </div>
  );
}
