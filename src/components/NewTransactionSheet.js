'use client';

import { useState } from 'react';
import { CATEGORIES, PURCHASE_CATEGORIES, POINTS_OPTIONS, PAYMENT_METHODS } from '@/utils/constants';
import { createManualTransaction } from '@/services/api';

/**
 * Typing a transaction in by hand, on a phone.
 *
 * For the spending an alert never sees: cash, a split bill someone else put on their card, anything
 * from an account Chase does not alert on. Those are the transactions most likely to be forgotten,
 * so the form has to be quicker than the excuse for skipping it.
 *
 * Amount and description are all that is required. Everything else is derived the same way an
 * ingested row derives it — the sign from the account, the points from the card, the category from
 * the description — so a hand-typed row and an alert-fed one are indistinguishable afterwards.
 */

const TAP = 'min-h-[44px] px-4 rounded-xl active:scale-[0.97] transition-transform';

/** Today, in the ledger's format. Local, not UTC — near midnight those differ by a day. */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Chip({ selected, onClick, children, tone = 'blue' }) {
  const palette = { blue: 'bg-blue-500 border-blue-400', green: 'bg-emerald-600 border-emerald-500' }[tone];
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

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </div>
  );
}

export default function NewTransactionSheet({ onClose, onCreated }) {
  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: today(),
    transactionType: 'expense',
    paymentMethod: 'Cash',
    category: '',
    purchaseCategory: [],
    points: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const ready = form.amount !== '' && Number(form.amount) !== 0 && form.description.trim() !== '';

  async function save(allowDuplicate = false) {
    try {
      setSaving(true);
      const result = await createManualTransaction({
        ...form,
        amount: Number(form.amount),
        description: form.description.trim(),
        allowDuplicate,
      });

      if (result.duplicate) {
        // Two identical purchases on one day are real, so this asks rather than refusing.
        const t = result.transaction;
        const again = confirm(
          `Already logged:\n${t.date}  ${Number(t.amount).toFixed(2)}  ${t.description}\n\n`
          + 'Save it anyway as a second transaction?'
        );
        if (!again) { onClose(); return; }
        return save(true);
      }

      onCreated(result.transaction);
    } catch (err) {
      alert(`Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[92vh] bg-gray-900 rounded-t-3xl border-t border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold">New transaction</h2>
          <button type="button" onClick={onClose} className={`${TAP} bg-gray-700 text-[15px]`}>
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {/* Amount leads, and is the size it is because it is the one number that must be right. */}
          <Field label="Amount">
            <div className="flex items-center gap-2">
              <span className="text-2xl text-gray-500">$</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="flex-1 min-h-[52px] px-3 rounded-xl bg-gray-800 border border-gray-700 text-2xl font-bold tabular-nums"
              />
            </div>
            <p className="text-xs text-gray-500">
              Type it positive. The sign follows the account — a charge is positive on a card,
              negative on checking.
            </p>
          </Field>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Where the money went"
              className={`${TAP} w-full bg-gray-800 border border-gray-700 text-[15px]`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={`${TAP} w-full bg-gray-800 border border-gray-700 text-[15px]`}
              />
            </Field>
            <Field label="Direction">
              <div className="flex gap-2">
                {['expense', 'income'].map((t) => (
                  <Chip key={t} selected={form.transactionType === t} onClick={() => set('transactionType', t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Paid with">
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <Chip key={pm} selected={form.paymentMethod === pm} onClick={() => set('paymentMethod', pm)}>
                  {pm}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} selected={form.category === c} onClick={() => set('category', c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Purchase category">
            <div className="flex flex-wrap gap-2">
              {PURCHASE_CATEGORIES.map((pc) => {
                const on = form.purchaseCategory.includes(pc);
                return (
                  <Chip
                    key={pc}
                    tone="green"
                    selected={on}
                    onClick={() =>
                      set('purchaseCategory', on
                        ? form.purchaseCategory.filter((x) => x !== pc)
                        : [...form.purchaseCategory, pc])
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
                <Chip key={p} selected={Number(form.points) === p} onClick={() => set('points', p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-[15px]"
            />
          </Field>
        </div>

        <div
          className="px-4 pt-3 border-t border-gray-800"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <button
            type="button"
            onClick={() => save(false)}
            disabled={!ready || saving}
            className="w-full min-h-[48px] rounded-xl bg-blue-600 font-semibold text-[15px] disabled:bg-gray-600 disabled:text-gray-400"
          >
            {saving ? 'Saving…' : ready ? 'Save transaction' : 'Amount and description needed'}
          </button>
        </div>
      </div>
    </div>
  );
}
