'use client';

import { useState } from 'react';
import { BUDGET_CATEGORIES } from '@/utils/constants';

/**
 * Setting the monthly allowance for each category.
 *
 * A sheet rather than a page: budgets are set once and adjusted rarely, so it should open over the
 * list and close again without losing your place in it.
 *
 * "etc." is offered alongside the real categories because spending with no category still happens
 * and still needs an allowance — leaving it out would make the one line you cannot control the one
 * you cannot budget for either.
 */
const EDITABLE = [...BUDGET_CATEGORIES, 'etc.'];

export default function BudgetEditor({ initial, onClose, onSaved }) {
  const [values, setValues] = useState(() => {
    const start = {};
    EDITABLE.forEach((c) => { start[c] = initial?.[c] != null ? String(initial[c]) : ''; });
    return start;
  });
  const [saving, setSaving] = useState(false);

  const total = EDITABLE.reduce((sum, c) => sum + (Number(values[c]) || 0), 0);

  async function save() {
    const monthly = {};
    for (const c of EDITABLE) {
      const n = Number(values[c]);
      // An empty box means "no budget", which is not the same as typing 0 but behaves identically —
      // so it is simply omitted rather than stored as a deliberate zero.
      if (values[c] !== '' && Number.isFinite(n) && n >= 0) monthly[c] = n;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      onSaved(monthly);
    } catch (err) {
      alert(`Could not save budgets: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[88vh] bg-gray-900 rounded-t-3xl border-t border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Monthly budgets</h2>
            <p className="text-sm text-gray-400 tabular-nums">${total.toFixed(2)} per month total</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-gray-700 text-[15px]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {EDITABLE.map((c) => (
            <label key={c} className="flex items-center gap-3 min-h-[44px]">
              <span className="flex-1 text-[15px]">{c}</span>
              <span className="text-gray-500">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                value={values[c]}
                onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}
                className="w-28 min-h-[44px] px-3 rounded-xl bg-gray-800 border border-gray-700 text-right tabular-nums text-[15px]"
              />
            </label>
          ))}
        </div>

        <div
          className="px-4 pt-3 border-t border-gray-800"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-blue-600 font-semibold text-[15px] disabled:bg-gray-600"
          >
            {saving ? 'Saving…' : 'Save budgets'}
          </button>
        </div>
      </div>
    </div>
  );
}
