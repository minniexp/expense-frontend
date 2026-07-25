'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchTrips, createTrip, deleteTrip,
  fetchTripMembers, createTripMember, deleteTripMember,
} from '@/services/api';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

/**
 * Trip index: create trips, pick who is on them, and manage the reusable member roster.
 *
 * The roster is deliberately separate from trips. Typing names per trip would let "Sharon" and
 * "sharon" become two people who then owe each other money, so members are created once and
 * selected afterwards.
 */
export default function TripsListClient() {
  const [trips, setTrips] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showRoster, setShowRoster] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', description: '', memberIds: [],
  });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [t, m] = await Promise.all([fetchTrips(), fetchTripMembers()]);
      setTrips(t);
      setMembers(m);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    if (!name) return;
    try {
      setBusy(true);
      await createTripMember({ name });
      setNewMemberName('');
      setMembers(await fetchTripMembers());
    } catch (e) {
      alert(e.message);   // e.g. a duplicate name, which the backend rejects deliberately
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (m) => {
    if (!window.confirm(`Remove ${m.name} from the roster?`)) return;
    try {
      setBusy(true);
      const res = await deleteTripMember(m._id);
      if (res.archived) {
        alert(`${m.name} appears in existing trips, so they were archived rather than deleted. `
          + 'Their history stays intact and they no longer appear in pickers.');
      }
      setMembers(await fetchTripMembers());
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Give the trip a name');
    if (form.memberIds.length === 0) return alert('Pick at least one member');
    try {
      setBusy(true);
      await createTrip({ ...form, name: form.name.trim() });
      setForm({ name: '', startDate: '', endDate: '', description: '', memberIds: [] });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTrip = async (t) => {
    if (!window.confirm(
      `Delete "${t.name}"?\n\nThis also deletes its ${t.expenseCount} expense(s) and all `
      + 'settlements. This cannot be undone.'
    )) return;
    try {
      setBusy(true);
      await deleteTrip(t._id);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = (id) => setForm((f) => ({
    ...f,
    memberIds: f.memberIds.includes(id)
      ? f.memberIds.filter((x) => x !== id)
      : [...f.memberIds, id],
  }));

  return (
    <div className="container mx-auto p-4 text-white">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Trips &amp; Expense Splitter</h1>
        <button
          onClick={() => setShowRoster((s) => !s)}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          {showRoster ? 'Hide' : 'Manage'} people ({members.length})
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {/* ---- roster ---- */}
      {showRoster && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="font-bold mb-1">People</h2>
          <p className="text-xs text-gray-400 mb-3">
            Added once and reused across trips, so the same person is never entered twice under
            slightly different spellings. Someone who already appears in a trip is archived
            rather than deleted, keeping past splits explainable.
          </p>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="Name, e.g. Mom"
              className="bg-gray-700 rounded px-3 py-1 border border-gray-600 flex-1 min-w-[180px]"
            />
            <button
              onClick={handleAddMember}
              disabled={busy || !newMemberName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-1 rounded font-bold"
            >
              Add
            </button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">Nobody yet. Add the people you travel with.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span key={m._id} className="bg-gray-800 border border-gray-600 rounded-full px-3 py-1 text-sm flex items-center gap-2">
                  {m.name}
                  <button
                    onClick={() => handleRemoveMember(m)}
                    className="text-gray-500 hover:text-red-400"
                    title="Remove from roster"
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- new trip ---- */}
      <form onSubmit={handleCreateTrip} className="mb-8 bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="font-bold mb-3">New trip</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Trip name, e.g. LA March 2026"
            className="bg-gray-700 rounded px-3 py-2 border border-gray-600"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            className="bg-gray-700 rounded px-3 py-2 border border-gray-600"
          />
          <label className="text-sm text-gray-300">
            Start
            <input
              type="date" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
            />
          </label>
          <label className="text-sm text-gray-300">
            End
            <input
              type="date" value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-300 mb-2">Who is coming?</div>
          {members.length === 0 ? (
            <p className="text-sm text-amber-400">
              Add people first — use “Manage people” above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  type="button" key={m._id}
                  onClick={() => toggleMember(m._id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    form.memberIds.includes(m._id)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={busy || members.length === 0}
          className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-5 py-2 rounded font-bold"
        >
          Create trip
        </button>
      </form>

      {/* ---- trips ---- */}
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : trips.length === 0 ? (
        <p className="text-gray-500">No trips yet. Create one above.</p>
      ) : (
        <div className="grid gap-3">
          {trips.map((t) => (
            <div key={t._id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <Link href={`/trips/${t._id}`} className="text-lg font-bold text-blue-400 hover:text-blue-300">
                  {t.name}
                </Link>
                {t.description && <p className="text-sm text-gray-400">{t.description}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  {t.startDate || '—'}{t.endDate ? ` → ${t.endDate}` : ''}
                  {' · '}{(t.memberIds || []).map((m) => m.name).join(', ') || 'no members'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{money(t.total)}</div>
                <div className="text-xs text-gray-400">{t.expenseCount} expense{t.expenseCount === 1 ? '' : 's'}</div>
                {t.expenseCount > 0 && (
                  <div className={`text-xs mt-1 ${t.isFullySettled ? 'text-green-400' : 'text-amber-400'}`}>
                    {t.isFullySettled ? '✓ all settled' : 'outstanding'}
                  </div>
                )}
                <button
                  onClick={() => handleDeleteTrip(t)}
                  className="text-xs text-gray-500 hover:text-red-400 mt-2 underline"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
