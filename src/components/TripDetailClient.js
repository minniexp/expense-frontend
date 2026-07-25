'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchTripSummary, createTripExpense, deleteTripExpense,
  createTripSettlement, deleteTripSettlement,
} from '@/services/api';

const money = (n) => `$${Math.abs(Number(n || 0)).toFixed(2)}`;
const signed = (n) => `${Number(n) < 0 ? '−' : '+'}${money(n)}`;

const SPLIT_TYPES = [
  { id: 'equal',     label: 'Split equally',   hint: 'Divided evenly among everyone selected.' },
  { id: 'custom',    label: 'Exact amounts',   hint: 'Type what each person owes. Must add up to the total.' },
  { id: 'itemized',  label: 'Itemised',        hint: 'Assign items to people; tip and tax follow what each ordered.' },
  { id: 'by_nights', label: 'By nights stayed', hint: 'Weighted by how many nights each person stayed.' },
];

const CATEGORIES = ['dining', 'lodging', 'transport', 'activity', 'groceries', 'other'];

/**
 * Trip detail: what was spent, who paid, and who owes whom.
 *
 * Every number shown here is computed by the backend (services/expenseSplitter.js) in integer
 * cents. This component does no money arithmetic beyond formatting — a second implementation of
 * the split maths in the browser would be a second thing to get wrong, and the two would drift.
 */
export default function TripDetailClient({ tripId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const blank = {
    description: '', date: new Date().toISOString().slice(0, 10), amount: '',
    category: 'dining', paidByMemberId: '', splitType: 'equal', splitAmong: [],
    tip: '', tax: '', lineItems: [], guestStays: [], customSplits: [], notes: '',
  };
  const [form, setForm] = useState(blank);

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
      <div className="bg-red-900/40 border border-red-700 rounded p-4 text-white">{error}</div>
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
    if (i >= 0) rows[i] = { ...rows[i], ...patch };
    else rows.push({ memberId, ...patch });
    return { ...f, [key]: rows };
  });

  const rowVal = (key, memberId, field, dflt = '') => {
    const r = form[key].find((x) => String(x.memberId) === String(memberId));
    return r && r[field] !== undefined ? r[field] : dflt;
  };

  // Live preview of whether an "exact amounts" split adds up, so the error is visible before
  // submitting rather than coming back from the server.
  const customSum = form.customSplits.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const customMatches = Math.abs(customSum - (Number(form.amount) || 0)) < 0.005;

  const itemsSum = form.lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
  const itemsTotal = itemsSum + (Number(form.tip) || 0) + (Number(form.tax) || 0);
  const itemsMatch = Math.abs(itemsTotal - (Number(form.amount) || 0)) < 0.005;

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const payload = {
        description: form.description, date: form.date, amount: Number(form.amount),
        category: form.category, paidByMemberId: form.paidByMemberId,
        splitType: form.splitType, splitAmong: form.splitAmong, notes: form.notes,
      };
      if (form.splitType === 'itemized') {
        payload.lineItems = form.lineItems.filter((li) => li.amount !== '' && li.amount != null);
        payload.tip = Number(form.tip) || 0;
        payload.tax = Number(form.tax) || 0;
      }
      if (form.splitType === 'by_nights') {
        payload.guestStays = form.splitAmong.map((id) => ({
          memberId: id, nights: Number(rowVal('guestStays', id, 'nights', 0)) || 0,
        }));
      }
      if (form.splitType === 'custom') {
        payload.customSplits = form.splitAmong.map((id) => ({
          memberId: id, amount: Number(rowVal('customSplits', id, 'amount', 0)) || 0,
        }));
      }
      await createTripExpense(tripId, payload);
      setForm({ ...blank, paidByMemberId: form.paidByMemberId, splitAmong: form.splitAmong });
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.message);   // backend validation, e.g. splits that do not sum to the total
    } finally { setBusy(false); }
  };

  const settle = async (t, full) => {
    const amount = full ? t.amount : Number(window.prompt(
      `How much is ${t.fromName} paying ${t.toName}? (owing ${money(t.amount)})`, t.amount));
    if (!amount || Number.isNaN(amount) || amount <= 0) return;
    try {
      setBusy(true);
      await createTripSettlement(tripId, {
        fromMemberId: t.fromMemberId, toMemberId: t.toMemberId, amount,
        date: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto p-4 text-white">
      <Link href="/trips" className="text-blue-400 underline text-sm">← All trips</Link>

      <div className="flex items-end justify-between flex-wrap gap-3 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{data.trip.name}</h1>
          <p className="text-sm text-gray-400">
            {data.trip.startDate || '—'}{data.trip.endDate ? ` → ${data.trip.endDate}` : ''}
            {' · '}{members.map((m) => m.name).join(', ')}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{money(data.totals.total)}</div>
          <div className="text-xs text-gray-400">{data.totals.expenseCount} expenses</div>
        </div>
      </div>

      {data.transferError && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded p-3 text-sm">
          Balances could not be settled: {data.transferError}
        </div>
      )}

      {/* ---- balances ---- */}
      <section className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="font-bold mb-3">Balances</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="text-left py-1">Person</th>
                <th className="text-right py-1">Paid</th>
                <th className="text-right py-1">Their share</th>
                <th className="text-right py-1">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((b) => (
                <tr key={b.memberId} className="border-b border-gray-800">
                  <td className="py-2">{b.name}</td>
                  <td className="py-2 text-right">{money(b.paid)}</td>
                  <td className="py-2 text-right text-gray-400">{money(b.owes)}</td>
                  <td className={`py-2 text-right font-bold ${
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
      <section className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="font-bold mb-1">Who pays whom</h2>
        <p className="text-xs text-gray-400 mb-3">
          Debts are netted first, so this is the fewest payments that settle everyone — not one
          payment per expense.
        </p>
        {data.isFullySettled ? (
          <p className="text-green-400 font-bold">✓ All settled up</p>
        ) : (
          <div className="grid gap-2">
            {data.transfers.map((t) => (
              <div key={`${t.fromMemberId}-${t.toMemberId}`}
                className="flex items-center justify-between gap-3 bg-gray-800 rounded p-3 flex-wrap">
                <div>
                  <span className="text-red-400">{t.fromName}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className="text-green-400">{t.toName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{money(t.amount)}</span>
                  <button onClick={() => settle(t, true)} disabled={busy}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm font-bold">
                    Mark paid
                  </button>
                  <button onClick={() => settle(t, false)} disabled={busy}
                    className="text-blue-400 hover:text-blue-300 underline text-sm">
                    part-pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- expenses ---- */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Expenses</h2>
          <button onClick={() => setShowForm((s) => !s)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-sm">
            {showForm ? 'Cancel' : '+ Add expense'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mb-4 bg-gray-900 border border-gray-700 rounded-lg p-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input required value={form.description} placeholder="What was it? e.g. Dinner at Savor"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600" />
              <input required type="number" step="0.01" min="0.01" value={form.amount} placeholder="Total amount"
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600" />
              <input required type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <label className="text-sm text-gray-300">
              Who paid?
              <select value={form.paidByMemberId} onChange={(e) => setForm({ ...form, paidByMemberId: e.target.value })}
                className="mt-1 w-full bg-gray-700 rounded px-3 py-2 border border-gray-600">
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </label>

            <div>
              <div className="text-sm text-gray-300 mb-1">Split among</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button type="button" key={m._id} onClick={() => toggleIn('splitAmong', String(m._id))}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      form.splitAmong.includes(String(m._id))
                        ? 'bg-blue-600 border-blue-500' : 'border-gray-600 text-gray-300'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The payer still owes their own share — paying does not exempt you from your portion.
              </p>
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-1">How to split</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SPLIT_TYPES.map((s) => (
                  <button type="button" key={s.id} onClick={() => setForm({ ...form, splitType: s.id })}
                    className={`text-left px-3 py-2 rounded border ${
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
                  <div key={id} className="flex items-center gap-3 mb-2">
                    <span className="w-32 text-sm">{nameOf(id)}</span>
                    <input type="number" step="0.01" placeholder="0.00"
                      value={rowVal('customSplits', id, 'amount')}
                      onChange={(e) => setRow('customSplits', id, { amount: e.target.value })}
                      className="bg-gray-700 rounded px-2 py-1 border border-gray-600 w-32" />
                  </div>
                ))}
                <div className={`text-sm mt-2 ${customMatches ? 'text-green-400' : 'text-amber-400'}`}>
                  Sum {money(customSum)} of {money(form.amount || 0)}
                  {customMatches ? ' ✓ matches' : ' — must match the total exactly'}
                </div>
              </div>
            )}

            {form.splitType === 'by_nights' && (
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-400 mb-2">
                  Nights each person stayed. Cost is weighted by these, so someone who stayed
                  fewer nights pays proportionally less.
                </div>
                {form.splitAmong.map((id) => (
                  <div key={id} className="flex items-center gap-3 mb-2">
                    <span className="w-32 text-sm">{nameOf(id)}</span>
                    <input type="number" min="0" step="1" placeholder="0"
                      value={rowVal('guestStays', id, 'nights')}
                      onChange={(e) => setRow('guestStays', id, { nights: e.target.value })}
                      className="bg-gray-700 rounded px-2 py-1 border border-gray-600 w-24" />
                    <span className="text-xs text-gray-500">nights</span>
                  </div>
                ))}
              </div>
            )}

            {form.splitType === 'itemized' && (
              <div className="bg-gray-800 rounded p-3">
                {form.lineItems.map((li, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-4 mb-2 items-center">
                    <input placeholder="Item" value={li.label || ''}
                      onChange={(e) => setForm((f) => { const l = [...f.lineItems]; l[i] = { ...l[i], label: e.target.value }; return { ...f, lineItems: l }; })}
                      className="bg-gray-700 rounded px-2 py-1 border border-gray-600" />
                    <input type="number" step="0.01" placeholder="0.00" value={li.amount || ''}
                      onChange={(e) => setForm((f) => { const l = [...f.lineItems]; l[i] = { ...l[i], amount: e.target.value }; return { ...f, lineItems: l }; })}
                      className="bg-gray-700 rounded px-2 py-1 border border-gray-600" />
                    <select value={li.isShared ? 'shared' : (li.assignedToMemberId || '')}
                      onChange={(e) => setForm((f) => {
                        const l = [...f.lineItems];
                        l[i] = e.target.value === 'shared'
                          ? { ...l[i], isShared: true, assignedToMemberId: null }
                          : { ...l[i], isShared: false, assignedToMemberId: e.target.value };
                        return { ...f, lineItems: l };
                      })}
                      className="bg-gray-700 rounded px-2 py-1 border border-gray-600">
                      <option value="">Assign to…</option>
                      <option value="shared">Shared by all</option>
                      {form.splitAmong.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
                    </select>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, x) => x !== i) }))}
                      className="text-gray-500 hover:text-red-400 text-sm justify-self-start">remove</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, lineItems: [...f.lineItems, { label: '', amount: '', isShared: true }] }))}
                  className="text-blue-400 underline text-sm">+ add item</button>

                <div className="grid gap-2 md:grid-cols-2 mt-3">
                  <label className="text-sm text-gray-300">Tip
                    <input type="number" step="0.01" value={form.tip}
                      onChange={(e) => setForm({ ...form, tip: e.target.value })}
                      className="mt-1 w-full bg-gray-700 rounded px-2 py-1 border border-gray-600" /></label>
                  <label className="text-sm text-gray-300">Tax
                    <input type="number" step="0.01" value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      className="mt-1 w-full bg-gray-700 rounded px-2 py-1 border border-gray-600" /></label>
                </div>
                <div className={`text-sm mt-2 ${itemsMatch ? 'text-green-400' : 'text-amber-400'}`}>
                  Items + tip + tax = {money(itemsTotal)} of {money(form.amount || 0)}
                  {itemsMatch ? ' ✓ matches' : ' — must match the total exactly'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tip and tax are shared in proportion to what each person ordered, not split
                  equally — splitting them evenly overcharges whoever ordered least.
                </p>
              </div>
            )}

            <button type="submit" disabled={busy}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-5 py-2 rounded font-bold justify-self-start">
              {busy ? 'Saving…' : 'Add expense'}
            </button>
          </form>
        )}

        {data.expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet.</p>
        ) : (
          <div className="grid gap-2">
            {data.expenses.map((e) => (
              <div key={e._id} className="bg-gray-900 border border-gray-700 rounded p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold">{e.description}</div>
                    <div className="text-xs text-gray-400">
                      {e.date} · {e.category || 'other'} · paid by {nameOf(e.paidByMemberId)} ·{' '}
                      {(SPLIT_TYPES.find((s) => s.id === e.splitType) || {}).label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(e.amount)}</div>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete "${e.description}"?`)) return;
                        setBusy(true);
                        try { await deleteTripExpense(tripId, e._id); await load(); }
                        catch (err) { alert(err.message); } finally { setBusy(false); }
                      }}
                      className="text-xs text-gray-500 hover:text-red-400 underline">delete</button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {e.splits.map((s) => (
                    <span key={s.memberId} className="text-xs bg-gray-800 rounded px-2 py-1"
                      title={s.breakdown}>
                      {nameOf(s.memberId)} {money(s.amount)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- settlement history ---- */}
      {data.settlements.length > 0 && (
        <section className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="font-bold mb-3">Payments recorded</h2>
          <div className="grid gap-2">
            {data.settlements.map((s) => (
              <div key={s._id} className="flex items-center justify-between text-sm bg-gray-800 rounded p-2">
                <span>{nameOf(s.fromMemberId)} → {nameOf(s.toMemberId)}
                  {s.note && <span className="text-gray-500"> · {s.note}</span>}
                  {s.date && <span className="text-gray-500"> · {s.date}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold">{money(s.amount)}</span>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Undo this payment?')) return;
                      setBusy(true);
                      try { await deleteTripSettlement(tripId, s._id); await load(); }
                      catch (err) { alert(err.message); } finally { setBusy(false); }
                    }}
                    className="text-xs text-gray-500 hover:text-red-400 underline">undo</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
