'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchTripSummary, createTripExpense, updateTripExpense, deleteTripExpense,
  createTripSettlement, deleteTripSettlement,
} from '@/services/api';

const money = (n) => `$${Math.abs(Number(n || 0)).toFixed(2)}`;
const signed = (n) => `${Number(n) < 0 ? '−' : '+'}${money(n)}`;

const SPLIT_TYPES = [
  { id: 'equal',     label: 'Split equally',    hint: 'Divided evenly among everyone selected.' },
  { id: 'custom',    label: 'Exact amounts',    hint: 'Type what each person owes. Must add up to the total.' },
  { id: 'itemized',  label: 'Itemised',         hint: 'Assign items to people; tip and tax follow what each ordered.' },
  { id: 'by_nights', label: 'By nights stayed', hint: 'Weighted by how many nights each person stayed.' },
];
const CATEGORIES = ['dining', 'lodging', 'transport', 'activity', 'groceries', 'other'];

/* ---------------------------------------------------------------------------
 * Shared class strings.
 *
 * MOBILE NOTE: inputs are text-base (16px) on purpose. iOS Safari zooms the
 * viewport whenever a focused input has a font-size below 16px, which on a form
 * this long leaves the user pinching back out after every field.
 *
 * Tap targets are py-3 (~44px tall), the minimum comfortable touch size.
 * ------------------------------------------------------------------------- */
const INPUT = 'w-full bg-gray-700 text-white text-base rounded px-3 py-3 border border-gray-600 ' +
  'focus:border-blue-500 focus:outline-none';
const BTN = 'px-4 py-3 rounded font-bold text-base disabled:bg-gray-600 disabled:cursor-not-allowed';
const CHIP = 'px-4 py-2 rounded-full text-sm border min-h-[40px]';

/**
 * Trip detail: what was spent, who paid, who owes whom — with add, edit and delete.
 *
 * Every money figure comes from the backend (services/expenseSplitter.js), computed in integer
 * cents. This component formats and never calculates: a second implementation of the split
 * maths in the browser would be a second thing to get wrong, and the two would drift.
 *
 * Laid out mobile-first — single column by default, widening at `sm:`/`md:` — because this is
 * used on a phone as much as a laptop.
 */
export default function TripDetailClient({ tripId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);   // null = creating
  const [settling, setSettling] = useState(null);     // transfer key being part-paid
  const [partAmount, setPartAmount] = useState('');

  const blank = () => ({
    description: '', date: new Date().toISOString().slice(0, 10), amount: '',
    category: 'dining', paidByMemberId: '', splitType: 'equal', splitAmong: [],
    tip: '', tax: '', lineItems: [], guestStays: [], customSplits: [], notes: '',
  });
  const [form, setForm] = useState(blank());

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const s = await fetchTripSummary(tripId);
      setData(s);
      const ids = (s.trip.memberIds || []).map((m) => String(m._id));
      setForm((f) => ({
        ...f,
        paidByMemberId: f.paidByMemberId || ids[0] || '',
        splitAmong: f.splitAmong.length ? f.splitAmong : ids,
      }));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="container mx-auto p-4 text-gray-400">Loading trip…</div>;
  if (error) return (
    <div className="container mx-auto p-4">
      <div className="bg-red-900/40 border border-red-700 rounded p-4 text-white break-words">{error}</div>
      <Link href="/trips" className="text-blue-400 underline text-sm mt-3 inline-block">← All trips</Link>
    </div>
  );
  if (!data) return null;

  const members = data.trip.memberIds || [];
  const nameOf = (id) => (members.find((m) => String(m._id) === String(id)) || {}).name || 'Unknown';

  const toggleIn = (key, id) => setForm((f) => ({
    ...f,
    [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
  }));

  const setRow = (key, memberId, patch) => setForm((f) => {
    const rows = [...f[key]];
    const i = rows.findIndex((r) => String(r.memberId) === String(memberId));
    if (i >= 0) rows[i] = { ...rows[i], ...patch }; else rows.push({ memberId, ...patch });
    return { ...f, [key]: rows };
  });
  const rowVal = (key, memberId, field, dflt = '') => {
    const r = form[key].find((x) => String(x.memberId) === String(memberId));
    return r && r[field] !== undefined && r[field] !== null ? r[field] : dflt;
  };

  // Live "does it add up" feedback, so a mismatch is visible while typing rather than coming
  // back from the server after a submit.
  const customSum = form.splitAmong.reduce(
    (s, id) => s + (Number(rowVal('customSplits', id, 'amount', 0)) || 0), 0);
  const customMatches = Math.abs(customSum - (Number(form.amount) || 0)) < 0.005;
  const itemsSum = form.lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
  const itemsTotal = itemsSum + (Number(form.tip) || 0) + (Number(form.tax) || 0);
  const itemsMatch = Math.abs(itemsTotal - (Number(form.amount) || 0)) < 0.005;

  const startCreate = () => {
    const ids = members.map((m) => String(m._id));
    setEditingId(null);
    setForm({ ...blank(), paidByMemberId: ids[0] || '', splitAmong: ids });
    setShowForm(true);
  };

  /** Populate the form from an existing expense. All amounts arrive in dollars already. */
  const startEdit = (e) => {
    setEditingId(e._id);
    setForm({
      description: e.description || '',
      date: e.date || '',
      amount: String(e.amount ?? ''),
      category: e.category || 'other',
      paidByMemberId: String(e.paidByMemberId || ''),
      splitType: e.splitType || 'equal',
      splitAmong: (e.splitAmong || []).map(String),
      tip: e.tip ? String(e.tip) : '',
      tax: e.tax ? String(e.tax) : '',
      lineItems: (e.lineItems || []).map((li) => ({
        label: li.label || '',
        amount: String(li.amount ?? ''),
        isShared: Boolean(li.isShared),
        assignedToMemberId: li.assignedToMemberId ? String(li.assignedToMemberId) : null,
      })),
      guestStays: (e.guestStays || []).map((g) => ({
        memberId: String(g.memberId), nights: String(g.nights ?? ''),
      })),
      customSplits: (e.customSplits || []).map((c) => ({
        memberId: String(c.memberId), amount: String(c.amount ?? ''),
      })),
      notes: e.notes || '',
    });
    setShowForm(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(blank()); };

  const submit = async (ev) => {
    ev.preventDefault();
    try {
      setBusy(true);
      const payload = {
        description: form.description, date: form.date, amount: Number(form.amount),
        category: form.category, paidByMemberId: form.paidByMemberId,
        splitType: form.splitType, splitAmong: form.splitAmong, notes: form.notes,
        // Always send all three so switching split type on an edit clears the old inputs
        // rather than leaving stale line items behind the new choice.
        lineItems: form.splitType === 'itemized'
          ? form.lineItems.filter((li) => li.amount !== '' && li.amount != null) : [],
        tip: form.splitType === 'itemized' ? (Number(form.tip) || 0) : 0,
        tax: form.splitType === 'itemized' ? (Number(form.tax) || 0) : 0,
        guestStays: form.splitType === 'by_nights'
          ? form.splitAmong.map((id) => ({ memberId: id, nights: Number(rowVal('guestStays', id, 'nights', 0)) || 0 })) : [],
        customSplits: form.splitType === 'custom'
          ? form.splitAmong.map((id) => ({ memberId: id, amount: Number(rowVal('customSplits', id, 'amount', 0)) || 0 })) : [],
      };
      if (editingId) await updateTripExpense(tripId, editingId, payload);
      else await createTripExpense(tripId, payload);
      cancelForm();
      await load();
    } catch (err) {
      alert(err.message);   // backend validation, e.g. splits that do not sum to the total
    } finally { setBusy(false); }
  };

  const recordSettlement = async (t, amount) => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) return;
    try {
      setBusy(true);
      await createTripSettlement(tripId, {
        fromMemberId: t.fromMemberId, toMemberId: t.toMemberId, amount: Number(amount),
        date: new Date().toISOString().slice(0, 10),
      });
      setSettling(null); setPartAmount('');
      await load();
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 text-white max-w-4xl">
      <Link href="/trips" className="text-blue-400 underline text-sm inline-block py-2">← All trips</Link>

      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold break-words">{data.trip.name}</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {data.trip.startDate || '—'}{data.trip.endDate ? ` → ${data.trip.endDate}` : ''}
        </p>
        <p className="text-xs text-gray-500">{members.map((m) => m.name).join(' · ')}</p>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-bold">{money(data.totals.total)}</span>
          <span className="text-sm text-gray-400">{data.totals.expenseCount} expenses</span>
        </div>
      </header>

      {data.transferError && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded p-3 text-sm break-words">
          Balances could not be settled: {data.transferError}
        </div>
      )}

      {/* ---- balances: cards on phones, table from sm up ---- */}
      <section className="mb-5 bg-gray-900 border border-gray-700 rounded-lg p-3 sm:p-4">
        <h2 className="font-bold mb-3">Balances</h2>

        <div className="sm:hidden grid gap-2">
          {data.balances.map((b) => (
            <div key={b.memberId} className="bg-gray-800 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">{b.name}</span>
                <span className={`font-bold text-lg ${
                  b.status === 'owed' ? 'text-green-400'
                    : b.status === 'owes' ? 'text-red-400' : 'text-gray-500'}`}>
                  {b.netCents === 0 ? '—' : signed(b.net)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1 flex justify-between">
                <span>paid {money(b.paid)} · share {money(b.owes)}</span>
                <span>{b.status === 'owed' ? 'is owed' : b.status === 'owes' ? 'owes' : 'settled'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="text-left py-2">Person</th>
                <th className="text-right py-2">Paid</th>
                <th className="text-right py-2">Their share</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((b) => (
                <tr key={b.memberId} className="border-b border-gray-800">
                  <td className="py-3">{b.name}</td>
                  <td className="py-3 text-right">{money(b.paid)}</td>
                  <td className="py-3 text-right text-gray-400">{money(b.owes)}</td>
                  <td className={`py-3 text-right font-bold ${
                    b.status === 'owed' ? 'text-green-400'
                      : b.status === 'owes' ? 'text-red-400' : 'text-gray-500'}`}>
                    {b.netCents === 0 ? '—' : signed(b.net)}
                    <span className="block text-xs font-normal text-gray-500">
                      {b.status === 'owed' ? 'is owed' : b.status === 'owes' ? 'owes' : 'settled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- who pays whom ---- */}
      <section className="mb-5 bg-gray-900 border border-gray-700 rounded-lg p-3 sm:p-4">
        <h2 className="font-bold mb-1">Who pays whom</h2>
        <p className="text-xs text-gray-400 mb-3">
          Debts are netted first, so this is the fewest payments that settle everyone.
        </p>
        {data.isFullySettled ? (
          <p className="text-green-400 font-bold py-2">✓ All settled up</p>
        ) : (
          <div className="grid gap-3">
            {data.transfers.map((t) => {
              const key = `${t.fromMemberId}-${t.toMemberId}`;
              return (
                <div key={key} className="bg-gray-800 rounded p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="text-red-400">{t.fromName}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-green-400">{t.toName}</span>
                    </div>
                    <span className="font-bold text-lg">{money(t.amount)}</span>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button onClick={() => recordSettlement(t, t.amount)} disabled={busy}
                      className={`${BTN} bg-green-600 hover:bg-green-700 flex-1 min-w-[130px]`}>
                      Mark paid
                    </button>
                    <button
                      onClick={() => { setSettling(settling === key ? null : key); setPartAmount(''); }}
                      className={`${BTN} bg-gray-700 hover:bg-gray-600 flex-1 min-w-[130px]`}>
                      {settling === key ? 'Cancel' : 'Part payment'}
                    </button>
                  </div>
                  {settling === key && (
                    // Inline rather than window.prompt: a native prompt on mobile is awkward and
                    // loses what was typed if it is dismissed.
                    <div className="mt-3 flex gap-2 flex-wrap items-center">
                      <input type="number" inputMode="decimal" step="0.01" min="0.01"
                        max={t.amount} value={partAmount} placeholder={`0.00 of ${money(t.amount)}`}
                        onChange={(e) => setPartAmount(e.target.value)}
                        className={`${INPUT} flex-1 min-w-[140px]`} />
                      <button onClick={() => recordSettlement(t, partAmount)}
                        disabled={busy || !partAmount}
                        className={`${BTN} bg-green-600 hover:bg-green-700`}>Record</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- expenses ---- */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-bold">Expenses</h2>
          {!showForm && (
            <button onClick={startCreate} className={`${BTN} bg-blue-600 hover:bg-blue-700`}>
              + Add expense
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={submit} className="mb-4 bg-gray-900 border border-gray-700 rounded-lg p-3 sm:p-4 grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editingId ? 'Edit expense' : 'New expense'}</h3>
              <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-white text-sm py-2 px-3">
                Cancel
              </button>
            </div>

            <label className="text-sm text-gray-300">What was it?
              <input required value={form.description} placeholder="e.g. Dinner at Savor"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`mt-1 ${INPUT}`} /></label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-300">Total amount
                <input required type="number" inputMode="decimal" step="0.01" min="0.01"
                  value={form.amount} placeholder="0.00"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={`mt-1 ${INPUT}`} /></label>
              <label className="text-sm text-gray-300">Date
                <input required type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`mt-1 ${INPUT}`} /></label>
              <label className="text-sm text-gray-300">Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={`mt-1 ${INPUT}`}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></label>
              <label className="text-sm text-gray-300">Who paid?
                <select value={form.paidByMemberId}
                  onChange={(e) => setForm({ ...form, paidByMemberId: e.target.value })}
                  className={`mt-1 ${INPUT}`}>
                  {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select></label>
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-2">Split among</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button type="button" key={m._id} onClick={() => toggleIn('splitAmong', String(m._id))}
                    className={`${CHIP} ${form.splitAmong.includes(String(m._id))
                      ? 'bg-blue-600 border-blue-500' : 'border-gray-600 text-gray-300'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The payer still owes their own share — paying does not exempt you from your portion.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-2">How to split</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SPLIT_TYPES.map((s) => (
                  <button type="button" key={s.id} onClick={() => setForm({ ...form, splitType: s.id })}
                    className={`text-left px-3 py-3 rounded border ${
                      form.splitType === s.id ? 'bg-blue-600/20 border-blue-500' : 'border-gray-600'}`}>
                    <div className="font-bold text-sm">{s.label}</div>
                    <div className="text-xs text-gray-400">{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.splitType === 'custom' && (
              <div className="bg-gray-800 rounded p-3">
                {form.splitAmong.map((id) => (
                  <label key={id} className="flex items-center gap-3 mb-2 text-sm">
                    <span className="w-24 sm:w-32 shrink-0 truncate">{nameOf(id)}</span>
                    <input type="number" inputMode="decimal" step="0.01" placeholder="0.00"
                      value={rowVal('customSplits', id, 'amount')}
                      onChange={(e) => setRow('customSplits', id, { amount: e.target.value })}
                      className={INPUT} />
                  </label>
                ))}
                <div className={`text-sm mt-2 ${customMatches ? 'text-green-400' : 'text-amber-400'}`}>
                  Sum {money(customSum)} of {money(form.amount || 0)}
                  {customMatches ? ' ✓ matches' : ' — must match exactly'}
                </div>
              </div>
            )}

            {form.splitType === 'by_nights' && (
              <div className="bg-gray-800 rounded p-3">
                <p className="text-xs text-gray-400 mb-3">
                  Cost is weighted by these, so someone who stayed fewer nights pays less.
                </p>
                {form.splitAmong.map((id) => (
                  <label key={id} className="flex items-center gap-3 mb-2 text-sm">
                    <span className="w-24 sm:w-32 shrink-0 truncate">{nameOf(id)}</span>
                    <input type="number" inputMode="numeric" min="0" step="1" placeholder="0"
                      value={rowVal('guestStays', id, 'nights')}
                      onChange={(e) => setRow('guestStays', id, { nights: e.target.value })}
                      className={INPUT} />
                    <span className="text-xs text-gray-500 shrink-0">nights</span>
                  </label>
                ))}
              </div>
            )}

            {form.splitType === 'itemized' && (
              <div className="bg-gray-800 rounded p-3">
                {form.lineItems.map((li, i) => (
                  <div key={i} className="grid gap-2 mb-4 pb-4 border-b border-gray-700 last:border-0">
                    <input placeholder="Item, e.g. Steak" value={li.label || ''}
                      onChange={(e) => setForm((f) => { const l = [...f.lineItems]; l[i] = { ...l[i], label: e.target.value }; return { ...f, lineItems: l }; })}
                      className={INPUT} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={li.amount || ''}
                        onChange={(e) => setForm((f) => { const l = [...f.lineItems]; l[i] = { ...l[i], amount: e.target.value }; return { ...f, lineItems: l }; })}
                        className={INPUT} />
                      <select value={li.isShared ? 'shared' : (li.assignedToMemberId || '')}
                        onChange={(e) => setForm((f) => {
                          const l = [...f.lineItems];
                          l[i] = e.target.value === 'shared'
                            ? { ...l[i], isShared: true, assignedToMemberId: null }
                            : { ...l[i], isShared: false, assignedToMemberId: e.target.value };
                          return { ...f, lineItems: l };
                        })}
                        className={INPUT}>
                        <option value="">Assign to…</option>
                        <option value="shared">Shared by all</option>
                        {form.splitAmong.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
                      </select>
                    </div>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, x) => x !== i) }))}
                      className="text-gray-500 hover:text-red-400 text-sm justify-self-start py-2">
                      remove item
                    </button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, lineItems: [...f.lineItems, { label: '', amount: '', isShared: true }] }))}
                  className={`${BTN} bg-gray-700 hover:bg-gray-600 w-full`}>+ add item</button>

                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <label className="text-sm text-gray-300">Tip
                    <input type="number" inputMode="decimal" step="0.01" value={form.tip}
                      onChange={(e) => setForm({ ...form, tip: e.target.value })}
                      className={`mt-1 ${INPUT}`} /></label>
                  <label className="text-sm text-gray-300">Tax
                    <input type="number" inputMode="decimal" step="0.01" value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      className={`mt-1 ${INPUT}`} /></label>
                </div>
                <div className={`text-sm mt-2 ${itemsMatch ? 'text-green-400' : 'text-amber-400'}`}>
                  Items + tip + tax = {money(itemsTotal)} of {money(form.amount || 0)}
                  {itemsMatch ? ' ✓ matches' : ' — must match exactly'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tip and tax are shared in proportion to what each person ordered.
                </p>
              </div>
            )}

            <button type="submit" disabled={busy}
              className={`${BTN} bg-green-600 hover:bg-green-700 w-full sm:w-auto sm:justify-self-start`}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add expense'}
            </button>
          </form>
        )}

        {data.expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet.</p>
        ) : (
          <div className="grid gap-2">
            {data.expenses.map((e) => (
              <div key={e._id} className="bg-gray-900 border border-gray-700 rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold break-words">{e.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {e.date} · {e.category || 'other'} · paid by {nameOf(e.paidByMemberId)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(SPLIT_TYPES.find((s) => s.id === e.splitType) || {}).label}
                    </div>
                  </div>
                  <div className="font-bold shrink-0">{money(e.amount)}</div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.splits.map((s) => (
                    <span key={s.memberId} className="text-xs bg-gray-800 rounded px-2 py-1" title={s.breakdown}>
                      {nameOf(s.memberId)} {money(s.amount)}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => startEdit(e)} disabled={busy}
                    className="flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm font-bold">
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(
                        `Delete "${e.description}" (${money(e.amount)})?\n\n`
                        + 'Balances will be recalculated. This cannot be undone.')) return;
                      setBusy(true);
                      try { await deleteTripExpense(tripId, e._id); await load(); }
                      catch (err) { alert(err.message); } finally { setBusy(false); }
                    }}
                    disabled={busy}
                    className="flex-1 py-2 rounded bg-red-900/50 hover:bg-red-800 text-sm font-bold">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- settlement history ---- */}
      {data.settlements.length > 0 && (
        <section className="bg-gray-900 border border-gray-700 rounded-lg p-3 sm:p-4">
          <h2 className="font-bold mb-3">Payments recorded</h2>
          <div className="grid gap-2">
            {data.settlements.map((s) => (
              <div key={s._id} className="bg-gray-800 rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm min-w-0 break-words">
                    {nameOf(s.fromMemberId)} → {nameOf(s.toMemberId)}
                  </span>
                  <span className="font-bold shrink-0">{money(s.amount)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {[s.date, s.note].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Undo this payment?')) return;
                      setBusy(true);
                      try { await deleteTripSettlement(tripId, s._id); await load(); }
                      catch (err) { alert(err.message); } finally { setBusy(false); }
                    }}
                    className="text-xs text-gray-500 hover:text-red-400 underline py-1">undo</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
