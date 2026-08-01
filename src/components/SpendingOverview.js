'use client';

import { useState } from 'react';
import { MONTH_NAMES } from '@/utils/constants';

/**
 * This month's spending against a rolling budget, per category.
 *
 * Three numbers, because one is not enough to act on. `current` says what has gone out this month;
 * `budgeted` says what a month is meant to hold; `accumulated` says what is actually left once
 * every month since January is taken into account — an underspent January still funds March, and an
 * overspent one still hurts.
 *
 * The bar shows `current` against the accrued allowance rather than against the monthly figure. A
 * bar filled to 80% of one month reads as comfortable even when the year is already overdrawn, so
 * it is the running position the bar has to show.
 */

const money = (n) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Bar({ current, accumulated, budgeted }) {
  // What was available before this month's spending: the running allowance plus what has gone.
  const available = accumulated + current;
  const ceiling = Math.max(available, current, budgeted, 1);
  const spentPct = Math.min(100, (current / ceiling) * 100);
  const overdrawn = accumulated < 0;

  return (
    <div className="h-2.5 rounded-full bg-gray-700 overflow-hidden flex">
      <div
        className={`h-full ${overdrawn ? 'bg-red-500' : 'bg-emerald-500'}`}
        style={{ width: `${spentPct}%` }}
      />
    </div>
  );
}

export default function SpendingOverview({ summary, onEditBudgets }) {
  const [open, setOpen] = useState(true);
  if (!summary) return null;

  const { categories = [], totals = {}, month, year } = summary;
  const monthName = MONTH_NAMES[month] || month;
  const worstFirst = [...categories].sort((a, b) => a.accumulated - b.accumulated);
  const overdrawn = worstFirst.filter((c) => c.accumulated < 0);

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left active:bg-gray-700/50"
      >
        <div>
          <h2 className="font-semibold">{monthName} {year}</h2>
          <p className="text-sm text-gray-400 tabular-nums">
            {money(totals.current)} spent
            {overdrawn.length > 0 && (
              <span className="text-red-400"> · {overdrawn.length} over budget</span>
            )}
          </p>
        </div>
        <span className="text-gray-400 text-sm">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-700 pt-4">
          {/* The three totals, named the same way they are named per category below. */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Spent', totals.current, 'text-white'],
              ['Budget/mo', totals.budgeted, 'text-gray-300'],
              ['Left', totals.accumulated, totals.accumulated < 0 ? 'text-red-400' : 'text-emerald-400'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl bg-gray-900/60 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
                <div className={`text-base font-bold tabular-nums ${tone}`}>{money(value)}</div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No spending yet this month, and no budgets set.
            </p>
          )}

          {/* Worst position first — what is overdrawn is what needs looking at. */}
          <div className="flex flex-col gap-3.5">
            {worstFirst.map((c) => (
              <div key={c.category} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium truncate">{c.category}</span>
                  <span className="text-sm tabular-nums text-gray-300 shrink-0">
                    {money(c.current)}
                    <span className="text-gray-500"> / {money(c.budgeted)}</span>
                  </span>
                </div>
                <Bar current={c.current} accumulated={c.accumulated} budgeted={c.budgeted} />
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-gray-500">
                    {money(c.yearToDate)} since Jan
                  </span>
                  <span className={c.accumulated < 0 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                    {c.accumulated < 0 ? `${money(Math.abs(c.accumulated))} over` : `${money(c.accumulated)} left`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onEditBudgets}
            className="min-h-[44px] rounded-xl bg-gray-700 text-[15px] font-medium active:scale-[0.97] transition-transform"
          >
            Edit budgets
          </button>
        </div>
      )}
    </section>
  );
}
