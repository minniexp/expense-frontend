'use client';

import { useState, useMemo, useCallback } from 'react';
import { CATEGORIES, PURCHASE_CATEGORIES, POINTS_OPTIONS, PAYMENT_METHODS, MONTH_NAMES } from '@/utils/constants';
import { updateManyTransactions } from '@/services/api';
import SpendingOverview from '@/components/SpendingOverview';
import BudgetEditor from '@/components/BudgetEditor';
import MobileTripsClient from '@/components/MobileTripsClient';
import NewTransactionSheet from '@/components/NewTransactionSheet';

/**
 * Reviewing transactions on a phone.
 *
 * The desktop grid at /my is nineteen columns of inline-edited cells, which is the right shape for
 * a mouse and the wrong one for a thumb. This is the same data as a list of cards: one tap opens a
 * card, and the three fields that actually need setting on a new row — category, purchase category
 * and points — are the first thing inside it, as chips big enough to hit without aiming.
 *
 * Every field remains editable. Date and return come next, then the rest folded away, because
 * amount and merchant arrive correct from the alert and are read far more often than they are
 * changed.
 *
 * Nothing saves until you press Save. Edits are held per row so several cards can be worked
 * through and committed in one request.
 *
 * A second tab shares the same shell: Trips, for checking balances on the road without switching
 * to the desktop-shaped /trips pages. One header, one safe-area frame, one screen that already
 * has both hands' worth of thumb reach mapped out — a second page would just duplicate that.
 */

/** Apple's minimum comfortable target is 44pt. Every control here meets it. */
const TAP = 'min-h-[44px] px-4 rounded-xl active:scale-[0.97] transition-transform';

/** "8:51 PM ET" as minutes past midnight; -1 when absent, so undated rows sort last. */
function minutesIntoDay(time) {
  if (typeof time !== 'string') return -1;
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(time.trim());
  if (!match) return -1;
  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  if (rawHour < 1 || rawHour > 12 || minute > 59) return -1;
  return ((rawHour % 12) + (/pm/i.test(match[3]) ? 12 : 0)) * 60 + minute;
}

function Chip({ selected, onClick, children, tone = 'blue' }) {
  const palette = {
    blue: 'bg-blue-500 border-blue-400',
    green: 'bg-emerald-600 border-emerald-500',
    amber: 'bg-amber-500 border-amber-400',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${TAP} border text-[15px] font-medium whitespace-nowrap ${
        selected ? `${palette} text-white` : 'bg-gray-700 border-gray-600 text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function MobileReviewClient({ initialTransactions, initialReturns, tripLinks, initialSummary, initialBudgets, initialTrips }) {
  const [view, setView] = useState('review');   // 'review' | 'trips'
  // Defaults to the unreviewed queue: that is the reason to open this page. 'all' is there
  // for looking something up, not for the daily pass.
  const [showReviewed, setShowReviewed] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all');
  // Search is a mode, not another filter. It answers "where is that one transaction", which is a
  // different question from "what still needs reviewing" — so it sets the other filters aside
  // rather than compounding with them, and hides the month overview while it is open.
  const [addingNew, setAddingNew] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(initialSummary || null);
  const [budgets, setBudgets] = useState(initialBudgets || {});
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [edits, setEdits] = useState({});
  const [openId, setOpenId] = useState(null);
  const [saving, setSaving] = useState(false);

  const returns = initialReturns || [];
  const tripByTxn = useMemo(() => {
    const map = new Map();
    (tripLinks || []).forEach((l) => map.set(l.tellerTransactionId, l));
    return map;
  }, [tripLinks]);

  /** The row as it would be saved: what is stored, with any unsaved edit on top. */
  const merged = useCallback(
    (t) => ({ ...t, ...(edits[t._id] || {}) }),
    [edits]
  );

  const setField = (id, field, value) =>
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));

  const dirtyIds = Object.keys(edits);

  const searching = searchOpen && searchTerm.trim() !== '';

  /** Matches the fields you would actually remember: what, how much, where it was filed. */
  const matchesSearch = useCallback((t) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return false;
    return [t.description, t.notes, t.category, t.paymentMethod, t.date, t.time]
      .some((field) => String(field || '').toLowerCase().includes(q))
      || Math.abs(Number(t.amount)).toFixed(2).includes(q)
      || (t.purchaseCategory || []).some((pc) => String(pc).toLowerCase().includes(q));
  }, [searchTerm]);

  const visible = useMemo(() => {
    return transactions
      .map(merged)
      // Searching looks across everything: a transaction you are hunting for is usually one you
      // already reviewed, in a month you are not looking at.
      .filter((t) => (searching ? matchesSearch(t) : !showReviewed ? !t.reviewed : true))
      .filter((t) => (searching || monthFilter === 'all' ? true : t.month === Number(monthFilter)))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        const byTime = minutesIntoDay(b.time) - minutesIntoDay(a.time);
        return byTime !== 0 ? byTime : String(b._id).localeCompare(String(a._id));
      });
  }, [transactions, merged, showReviewed, monthFilter, searching, matchesSearch]);

  const unreviewedCount = transactions.filter((t) => !merged(t).reviewed).length;

  async function save() {
    if (dirtyIds.length === 0) return;
    const payload = transactions.filter((t) => edits[t._id]).map(merged);
    try {
      setSaving(true);
      const response = await updateManyTransactions(payload);
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      setTransactions((current) =>
        current.map((t) => (edits[t._id] ? merged(t) : t))
      );
      setEdits({});
      setOpenId(null);
    } catch (err) {
      alert(`Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sticky header. pt uses the safe-area inset so it clears the Dynamic Island. */}
      <header
        className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-800"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
      >
        <div className="px-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView('review')}
              className={`${TAP} text-[15px] font-semibold ${
                view === 'review' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => setView('trips')}
              className={`${TAP} text-[15px] font-semibold ${
                view === 'trips' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              Trips
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {view === 'review' && unreviewedCount > 0 && !searchOpen && (
              <span className="text-sm text-amber-400 tabular-nums">
                {unreviewedCount} to review
              </span>
            )}
            {view === 'review' && !searchOpen && (
              <button
                type="button"
                aria-label="New transaction"
                onClick={() => setAddingNew(true)}
                className="min-h-[44px] min-w-[44px] grid place-items-center rounded-xl bg-emerald-600 text-white active:scale-[0.97] transition-transform"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M10 4v12M4 10h12" />
                </svg>
              </button>
            )}
            {view === 'review' && (
              <button
                type="button"
                aria-label={searchOpen ? 'Close search' : 'Search transactions'}
                onClick={() => {
                  // Closing always clears, so the list you return to is the one you left.
                  if (searchOpen) setSearchTerm('');
                  setSearchOpen(!searchOpen);
                }}
                className={`min-h-[44px] min-w-[44px] grid place-items-center rounded-xl active:scale-[0.97] transition-transform ${
                  searchOpen ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {searchOpen ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="9" cy="9" r="6" />
                    <path d="M13.5 13.5L18 18" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {view === 'review' && searchOpen && (
          <div className="px-4 pb-3">
            <input
              autoFocus
              type="search"
              inputMode="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Merchant, amount, category, note…"
              className="w-full min-h-[44px] px-4 rounded-xl bg-gray-800 border border-gray-600 text-[15px]"
            />
          </div>
        )}

        {view === 'review' && !searchOpen && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            <Chip selected={!showReviewed} onClick={() => setShowReviewed(false)} tone="amber">
              Needs review{unreviewedCount > 0 ? ` (${unreviewedCount})` : ''}
            </Chip>
            <Chip selected={showReviewed} onClick={() => setShowReviewed(true)}>
              All
            </Chip>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={`${TAP} bg-gray-700 border border-gray-600 text-[15px]`}
            >
              <option value="all">Every month</option>
              {Object.entries(MONTH_NAMES).map(([n, name]) => (
                <option key={n} value={n}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="px-3 py-3 flex flex-col gap-2.5" style={{ paddingBottom: '7rem' }}>
        {view === 'trips' ? (
          <MobileTripsClient initialTrips={initialTrips} />
        ) : (
          <>
        {!searchOpen && (
          <SpendingOverview summary={summary} onEditBudgets={() => setEditingBudgets(true)} />
        )}

        {searchOpen && !searching && (
          <p className="text-center text-gray-400 py-16">
            Type to search all {transactions.length} transactions.
          </p>
        )}

        {(!searchOpen || searching) && visible.length === 0 && (
          <p className="text-center text-gray-400 py-16">
            {searching
              ? `Nothing matches “${searchTerm.trim()}”.`
              : showReviewed ? 'Nothing matches that filter.' : 'Everything is reviewed.'}
          </p>
        )}

        {(!searchOpen || searching) && visible.map((t) => {
          const open = openId === t._id;
          const trip = tripByTxn.get(t.tellerTransactionId);
          const isDirty = Boolean(edits[t._id]);

          return (
            <section
              key={t._id}
              className={`rounded-2xl border overflow-hidden ${
                t.reviewed ? 'border-gray-800 bg-gray-800/40' : 'border-amber-500/40 bg-gray-800'
              } ${isDirty ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Whole header is the tap target — a phone should not require aiming at a chevron. */}
              <button
                type="button"
                onClick={() => setOpenId(open ? null : t._id)}
                className="w-full text-left p-4 flex gap-3 items-start active:bg-gray-700/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!t.reviewed && <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />}
                    <span className="font-semibold truncate">{t.description || '(no description)'}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-400 flex items-center gap-2 flex-wrap">
                    <span className="tabular-nums">{t.date}</span>
                    {t.time && <span className="tabular-nums">{t.time}</span>}
                    <span>·</span>
                    <span>{t.paymentMethod || 'Cash'}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {t.category && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-200">
                        {t.category}
                      </span>
                    )}
                    {(t.purchaseCategory || []).map((pc) => (
                      <span key={pc} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200">
                        {pc}
                      </span>
                    ))}
                    {Number(t.points) > 0 && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/20 text-purple-200 tabular-nums">
                        {t.points} pts
                      </span>
                    )}
                    {trip && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-sky-500/25 text-sky-200">
                        ✈ {trip.tripName}
                      </span>
                    )}
                    {t.needToBePaidback && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/20 text-orange-200">
                        to be paid back
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`text-lg font-bold tabular-nums shrink-0 ${
                    t.transactionType === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {Number(t.amount).toFixed(2)}
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 flex flex-col gap-5 border-t border-gray-700 pt-4">
                  {/* The three that a freshly-ingested row almost always needs. */}
                  <Field label="Category">
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <Chip key={c} selected={t.category === c} onClick={() => setField(t._id, 'category', c)}>
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <Field label="Purchase category" hint="tap to toggle">
                    <div className="flex flex-wrap gap-2">
                      {PURCHASE_CATEGORIES.map((pc) => {
                        const on = (t.purchaseCategory || []).includes(pc);
                        return (
                          <Chip
                            key={pc}
                            tone="green"
                            selected={on}
                            onClick={() =>
                              setField(
                                t._id,
                                'purchaseCategory',
                                on
                                  ? (t.purchaseCategory || []).filter((x) => x !== pc)
                                  : [...(t.purchaseCategory || []), pc]
                              )
                            }
                          >
                            {pc}
                          </Chip>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Points">
                    <div className="flex flex-wrap gap-2">
                      {POINTS_OPTIONS.map((p) => (
                        <Chip key={p} selected={Number(t.points) === p} onClick={() => setField(t._id, 'points', p)}>
                          {p}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date">
                      <input
                        type="date"
                        value={t.date || ''}
                        onChange={(e) => {
                          const [y, m, d] = e.target.value.split('-').map(Number);
                          setEdits((prev) => ({
                            ...prev,
                            [t._id]: { ...(prev[t._id] || {}), date: e.target.value, year: y, month: m, day: d },
                          }));
                        }}
                        className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px]`}
                      />
                    </Field>

                    <Field label="Return">
                      <select
                        value={t.returnId || ''}
                        onChange={(e) => setField(t._id, 'returnId', e.target.value || null)}
                        className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px]`}
                      >
                        <option value="">None</option>
                        {returns.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.date} · {r.description || 'return'}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {trip && (
                    <p className="text-sm text-sky-200 bg-sky-500/10 border border-sky-500/30 rounded-xl p-3">
                      Part of <strong>{trip.tripName}</strong>
                      {trip.expenseDescription ? ` — ${trip.expenseDescription}` : ''}. Editing it here
                      changes the ledger row, not the trip split.
                    </p>
                  )}

                  {/* Everything else stays editable, just out of the way. */}
                  <details className="rounded-xl bg-gray-900/60 border border-gray-700">
                    <summary className="min-h-[44px] flex items-center px-4 text-[15px] text-gray-300 cursor-pointer">
                      Everything else
                    </summary>
                    <div className="p-4 pt-0 flex flex-col gap-4">
                      <Field label="Description">
                        <input
                          value={t.description || ''}
                          onChange={(e) => setField(t._id, 'description', e.target.value)}
                          className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px]`}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount">
                          <input
                            type="number"
                            step="0.01"
                            value={t.amount ?? ''}
                            onChange={(e) => setField(t._id, 'amount', Number(e.target.value))}
                            className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px] tabular-nums`}
                          />
                        </Field>
                        <Field label="Type">
                          <select
                            value={t.transactionType || 'expense'}
                            onChange={(e) => setField(t._id, 'transactionType', e.target.value)}
                            className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px]`}
                          >
                            <option value="expense">expense</option>
                            <option value="income">income</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Payment method">
                        <select
                          value={t.paymentMethod || ''}
                          onChange={(e) => setField(t._id, 'paymentMethod', e.target.value)}
                          className={`${TAP} w-full bg-gray-700 border border-gray-600 text-[15px]`}
                        >
                          {PAYMENT_METHODS.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
                        </select>
                      </Field>
                      <Field label="Notes">
                        <textarea
                          rows={2}
                          value={t.notes || ''}
                          onChange={(e) => setField(t._id, 'notes', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-xl p-3 text-[15px]"
                        />
                      </Field>
                      <div className="flex gap-2 flex-wrap">
                        <Chip
                          tone="amber"
                          selected={Boolean(t.needToBePaidback)}
                          onClick={() => setField(t._id, 'needToBePaidback', !t.needToBePaidback)}
                        >
                          Needs paying back
                        </Chip>
                        <Chip
                          tone="green"
                          selected={Boolean(t.returned)}
                          onClick={() => setField(t._id, 'returned', !t.returned)}
                        >
                          Returned
                        </Chip>
                      </div>
                    </div>
                  </details>

                  <button
                    type="button"
                    onClick={() => setField(t._id, 'reviewed', !t.reviewed)}
                    className={`${TAP} w-full font-semibold text-[15px] ${
                      t.reviewed ? 'bg-gray-700 text-gray-300' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {t.reviewed ? 'Mark as not reviewed' : 'Mark reviewed'}
                  </button>
                </div>
              )}
            </section>
          );
        })}
          </>
        )}
      </main>

      {addingNew && (
        <NewTransactionSheet
          onClose={() => setAddingNew(false)}
          onCreated={(created) => {
            setAddingNew(false);
            setTransactions((current) => [created, ...current]);
            // It arrives reviewed, so the default filter would hide it — show everything briefly so
            // what you just typed is visible rather than seeming not to have saved.
            setShowReviewed(true);
            setOpenId(created._id);
          }}
        />
      )}

      {editingBudgets && (
        <BudgetEditor
          initial={budgets}
          onClose={() => setEditingBudgets(false)}
          onSaved={async (monthly) => {
            setBudgets(monthly);
            setEditingBudgets(false);
            // Re-read rather than recompute here: `accumulated` spans the whole year, and the
            // server owns that arithmetic.
            try {
              const res = await fetch(`/api/budgets/summary?year=${summary?.year}&month=${summary?.month}`,
                { credentials: 'include' });
              if (res.ok) setSummary(await res.json());
            } catch { /* the numbers are stale, not wrong; the next load fixes them */ }
          }}
        />
      )}

      {/* Save bar. Only present when there is something to save, so it never steals a thumb-width
          of screen for nothing. */}
      {dirtyIds.length > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 bg-gray-900/95 backdrop-blur border-t border-gray-700 px-4 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEdits({})}
              disabled={saving}
              className={`${TAP} bg-gray-700 text-gray-200 font-semibold text-[15px]`}
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`${TAP} flex-1 bg-blue-600 text-white font-semibold text-[15px] disabled:bg-gray-600`}
            >
              {saving ? 'Saving…' : `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
