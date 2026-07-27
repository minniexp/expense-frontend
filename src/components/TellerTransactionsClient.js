'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchTellerTransactionsWithAuth,
  saveTransactions,
  ignoreTransactions,
  fetchIgnoredTransactions,
  restoreIgnoredTransactions,
} from '@/services/api';
import TellerLink from '@/components/TellerLink';

export default function ReviewPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTransactions, setSelectedTransactions] = useState(new Set());
    const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
    const [saving, setSaving] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const isProduction = process.env.NEXT_PUBLIC_DEPLOYED_STAGE === 'production';
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [statement, setStatement] = useState('Press Fetch Teller Transactions');
    // Lookback window for the review list. This is purely a display window — nothing is
    // permanently skipped by narrowing it, and widening it re-surfaces everything inside.
    const [lookback, setLookback] = useState('90');
    const [summary, setSummary] = useState(null);
    // Dismissed transactions: reviewed, deliberately not logged, filtered out of future
    // fetches by the backend. Kept reversible — this panel is how you undo one.
    const [ignoring, setIgnoring] = useState(false);
    const [ignoredList, setIgnoredList] = useState(null); // null = panel closed
    const [ignoredLoading, setIgnoredLoading] = useState(false);
    // Held in component state rather than collected via window.prompt, so that a failed
    // request does not throw away what was typed.
    const [ignoreNote, setIgnoreNote] = useState('');
  
    // Get unique categories from transactions
    const categories = ['all', ...new Set(transactions.map(t => t.category))].filter(Boolean);
    const months = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

    // Everything the backend returns is already the final list: transactions present in
    // MongoDB are removed server-side by ID before the response is built, so nothing shown
    // here is "already logged". The filters below are view conveniences only — they never
    // remove a row that would otherwise need action.
    //
    // NOTE: the month filter used to compare `month.padStart(2,'0')` against unpadded option
    // values ('01' === '1' is false), so filtering by any month Jan–Sep silently showed nothing.
    const filteredTransactions = transactions.filter(transaction => {
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesMonth = monthFilter === 'all' || String(transaction.month) === monthFilter;
      return matchesCategory && matchesMonth;
    });

    // Select All acts on what is VISIBLE. Combined with the rule above — no row is ever hidden
    // for being a duplicate or already-saved — "Select All" and "everything on screen" are the
    // same set, so it cannot pick up a row the user never saw.
    const allVisibleSelected =
      filteredTransactions.length > 0 &&
      filteredTransactions.every(t => selectedTransactions.has(t.tellerTransactionId));

    // Every count on the buttons is the count of rows that are selected AND on screen, so the
    // number on "Save Selected" is exactly what will be written.
    const selectedVisible = filteredTransactions.filter(t =>
      selectedTransactions.has(t.tellerTransactionId)
    );
    const selectedVisibleCount = selectedVisible.length;
    const selectedVisibleDuplicates = selectedVisible.filter(t => t.possibleDuplicate).length;

    const handleSelectAll = () => {
      const visibleIds = filteredTransactions.map(t => t.tellerTransactionId);
      setSelectedTransactions(prev => {
        const next = new Set(prev);
        if (allVisibleSelected) {
          visibleIds.forEach(id => next.delete(id));
        } else {
          visibleIds.forEach(id => next.add(id));
        }
        return next;
      });
    };
  
    const handleCheckboxChange = (transaction) => {
      setSelectedTransactions(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(transaction.tellerTransactionId)) {
          newSelected.delete(transaction.tellerTransactionId);
        } else {
          newSelected.add(transaction.tellerTransactionId);
        }
        return newSelected;
      });
    };
  
    const handleCellEdit = (transactionId, field, value) => {
      setTransactions(prevTransactions => {
        const newTransactions = prevTransactions.map(transaction => 
          transaction.tellerTransactionId === transactionId 
            ? { ...transaction, [field]: value }
            : transaction
        );
        
        // Update selectedTransactions if this transaction is selected
        if (selectedTransactions.has(transactionId)) {
          setSelectedTransactions(prev => {
            const newSelected = new Set(prev);
            return newSelected;
          });
        }
        
        return newTransactions;
      });
    };
  
    const categoryOptions = [
      'fuel', 'personal', 'parents-monthly', 'parents-not monthly',
      'bill', 'emergency', 'travel', 'offering', 'doctors', 'automobile', 'korea', 'business', 'misc', 'payroll'
    ];
  
    const purchaseCategoryOptions = [
      'groceries', 'amazon', 'dining', 'gift', 'gift card', 'birthday gift',
      'wedding gift', 'health', 'flight', 'hotel', 'drugstore', 'lyft',
      'travel', 'international', 'fuel'
    ];
  
    const pointsOptions = [0, 1, 1.5, 3, 4, 5, 7, 8, 10];
  
    const renderPointsSelector = (transaction, currentPoints) => {
      return (
        <div className="absolute z-10 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-600 min-w-[200px]">
          <div className="grid grid-cols-3 gap-2">
            {pointsOptions.map(points => (
              <button
                key={points}
                onClick={() => {
                  handleCellEdit(transaction.tellerTransactionId, 'points', points);
                  setEditingCell(null);
                }}
                className={`px-2 py-1 rounded text-sm ${
                  currentPoints === points
                    ? 'bg-blue-500 text-white'
                    : 'border border-blue-500 text-blue-500 hover:bg-blue-500/10'
                }`}
              >
                {points}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setEditingCell(null)}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Done
            </button>
          </div>
        </div>
      );
    };
  
    const renderPurchaseCategorySelector = (transaction, currentCategories) => {
      return (
        <div className="absolute z-10 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-600 min-w-[200px]">
          <div className="grid grid-cols-2 gap-2">
            {purchaseCategoryOptions.map(category => (
              <button
                key={category}
                onClick={() => {
                  const newCategories = currentCategories.includes(category)
                    ? currentCategories.filter(c => c !== category)
                    : [...currentCategories, category];
                  handleCellEdit(transaction.tellerTransactionId, 'purchaseCategory', newCategories);
                }}
                className={`px-2 py-1 rounded text-sm ${
                  currentCategories.includes(category)
                    ? 'bg-blue-500 text-white'
                    : 'border border-blue-500 text-blue-500 hover:bg-blue-500/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setEditingCell(null)}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Done
            </button>
          </div>
        </div>
      );
    };
  
    const renderEditableCell = (transaction, field, value) => {
      const isEditing = editingCell === `${transaction.tellerTransactionId}-${field}`;
      
      if (isEditing) {
        if (field === 'year' || field === 'month' || field === 'day') {
          return (
            <input
              type="number"
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value || ''}
              min={field === 'month' ? 1 : field === 'day' ? 1 : 1900}
              max={field === 'month' ? 12 : field === 'day' ? 31 : 2100}
              onChange={(e) => handleCellEdit(transaction.tellerTransactionId, field, parseInt(e.target.value))}
              onBlur={() => setEditingCell(null)}
            />
          );
        } else if (field === 'purchaseCategory') {
          return (
            <div className="relative">
              <div className="flex flex-wrap gap-1 min-h-[24px] p-1">
                {value.map(category => (
                  <span
                    key={category}
                    className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm"
                  >
                    {category}
                  </span>
                ))}
              </div>
              {renderPurchaseCategorySelector(transaction, value)}
            </div>
          );
        } else if (field === 'needToBePaidback' || field === 'returned') {
          return (
            <select
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value.toString()}
              onChange={(e) => {
                const newValue = e.target.value === 'true';
                handleCellEdit(transaction.tellerTransactionId, field, newValue);
              }}
              onBlur={() => setEditingCell(null)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          );
        } else if (field === 'notes') {
          return (
            <textarea
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value || ''}
              onChange={(e) => handleCellEdit(transaction.tellerTransactionId, field, e.target.value)}
              rows={3}
            />
          );
        } else if (field === 'category') {
          return (
            <select
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value || ''}
              onChange={(e) => handleCellEdit(transaction.tellerTransactionId, field, e.target.value)}
              onBlur={() => setEditingCell(null)}
            >
              <option value="">Select category</option>
              {categoryOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        } else if (field === 'transactionType') {
          return (
            <select
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value}
              onChange={(e) => handleCellEdit(transaction.tellerTransactionId, field, e.target.value)}
              onBlur={() => setEditingCell(null)}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          );
        } else if (field === 'points') {
          return (
            <div className="relative">
              <div className="flex items-center min-h-[24px] p-1">
                <span className={`px-2 py-0.5 rounded text-sm ${
                  value > 0 ? 'bg-blue-500 text-white' : 'text-gray-400'
                }`}>
                  {value}
                </span>
              </div>
              {renderPointsSelector(transaction, value)}
            </div>
          );
        } else {
          return (
            <input
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value || ''}
              onChange={(e) => handleCellEdit(transaction.tellerTransactionId, field, e.target.value)}
              onBlur={() => setEditingCell(null)}
            />
          );
        }
      }
  
      if (field === 'purchaseCategory') {
        return (
          <div 
            className="cursor-pointer flex flex-wrap gap-1 min-h-[24px]"
            onClick={() => setEditingCell(`${transaction.tellerTransactionId}-${field}`)}
          >
            {value && value.length > 0 ? (
              value.map(category => (
                <span
                  key={category}
                  className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm"
                >
                  {category}
                </span>
              ))
            ) : (
              <span className="text-gray-400">Click to select categories</span>
            )}
          </div>
        );
      }
  
      if (field === 'needToBePaidback' || field === 'returned') {
        return (
          <div 
            className="cursor-pointer"
            onClick={() => setEditingCell(`${transaction.tellerTransactionId}-${field}`)}
          >
            {value ? 'Yes' : 'No'}
          </div>
        );
      }
  
      if (field === 'points') {
        return (
          <div 
            className="cursor-pointer"
            onClick={() => setEditingCell(`${transaction.tellerTransactionId}-${field}`)}
          >
            <span className={`px-2 py-0.5 rounded text-sm ${
              value > 0 ? 'bg-blue-500 text-white' : 'text-gray-400'
            }`}>
              {value}
            </span>
          </div>
        );
      }
  
      return (
        <div 
          className="cursor-pointer"
          onClick={() => setEditingCell(`${transaction.tellerTransactionId}-${field}`)}
        >
          {Array.isArray(value) ? value.join(', ') || '-' : value || '-'}
        </div>
      );
    };
  
    const handleFetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await fetchTransactions();
        setTransactions(data);
        if (data.length === 0) {
          setStatement('No transactions found matching the selected filters.');
        } else {
          setStatement('Press Fetch Teller Transactions');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleFetchTellerTransactions = async (windowOverride) => {
      const chosen = windowOverride ?? lookback;
      try {
        setLoading(true);
        const options = chosen === 'all' ? { all: true } : { days: Number(chosen) };
        const { transactions: data, summary: fetchSummary } =
          await fetchTellerTransactionsWithAuth(options);

        setTransactions(data);
        setSummary(fetchSummary);
        setSelectedTransactions(new Set()); // stale ids must not survive a refetch

        if (data.length === 0) {
          if (fetchSummary) {
            const bits = [];
            if (fetchSummary.alreadyLogged) bits.push(`${fetchSummary.alreadyLogged} already saved`);
            if (fetchSummary.ignored) bits.push(`${fetchSummary.ignored} ignored`);
            if (fetchSummary.excluded) bits.push(`${fetchSummary.excluded} excluded as card payments/transfers`);
            if (fetchSummary.outsideWindow) bits.push(`${fetchSummary.outsideWindow} older than this window`);
            setStatement(
              `Nothing new to review. Of ${fetchSummary.fetched} transactions Chase returned: `
              + `${bits.join(', ')}.`
              + (fetchSummary.outsideWindow
                ? ' Looking for something older? Widen the look-back above.'
                : '')
            );
          } else {
            setStatement('No new transactions found.');
          }
        } else {
          setStatement('Press Fetch Teller Transactions');
        }
      } catch (error) {
        console.error('Error fetching Teller transactions:', error);
        setStatement(`Failed to fetch: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
  
    const handleSaveTransactions = async () => {
      if (selectedTransactions.size === 0) {
        alert('Please select transactions to save');
        return;
      }
  
      // Save only rows that are BOTH selected and currently on screen. A selection made before
      // a refetch or a filter change could otherwise carry an id the user can no longer see.
      const selectedTransactionData = filteredTransactions.filter(t =>
        selectedTransactions.has(t.tellerTransactionId)
      );

      if (selectedTransactionData.length === 0) {
        alert('The selected transactions are no longer visible. Fetch again and re-select.');
        setSelectedTransactions(new Set());
        return;
      }

      const duplicateCount = selectedTransactionData.filter(t => t.possibleDuplicate).length;
      if (duplicateCount > 0) {
        const proceed = window.confirm(
          `${duplicateCount} of the ${selectedTransactionData.length} selected transaction(s) are ` +
          'flagged as possible duplicates of entries already in your database. Save anyway?'
        );
        if (!proceed) return;
      }

      try {
        setSaving(true);
        await saveTransactions(selectedTransactionData);

        setSelectedTransactions(new Set());
        alert('Transactions saved successfully!');
        // Re-run the diff so saved rows drop off and anything still outstanding stays visible.
        await handleFetchTellerTransactions();
      } catch (error) {
        console.error('Error saving transactions:', error);
        alert('Failed to save transactions: ' + error.message);
      } finally {
        setSaving(false);
      }
    };
  
    const handleClearAll = () => {
      setSelectedTransactions(new Set());
    };
  
    /**
     * Mark the selected rows as reviewed-and-dismissed.
     *
     * This is NOT saving them: nothing is added to the ledger, and they contribute nothing to
     * totals, returns or points. It records "I looked at this and I don't want it", which the
     * backend then filters out of every future fetch — otherwise the self-healing diff would
     * keep re-offering them forever.
     *
     * Reversible: "Ignored" below lists everything dismissed and restores it in one click.
     */
    const handleIgnoreSelected = async () => {
      if (selectedVisibleCount === 0) {
        alert('Please select transactions to ignore');
        return;
      }

      const proceed = window.confirm(
        `Ignore ${selectedVisibleCount} transaction(s)?\n\n` +
        'They will NOT be saved to your ledger — this just marks them as reviewed so they ' +
        'stop appearing here on future fetches.\n\n' +
        'You can undo this any time from the "Ignored" panel.'
      );
      if (!proceed) return;

      try {
        setIgnoring(true);
        const result = await ignoreTransactions(selectedVisible, ignoreNote.trim());
        setSelectedTransactions(new Set());
        setIgnoreNote(''); // cleared only on success — a failed attempt keeps what was typed
        alert(
          `${result.newlyIgnored} transaction(s) ignored` +
          (result.alreadyIgnored ? `, ${result.alreadyIgnored} already were.` : '.')
        );
        await handleFetchTellerTransactions();
        if (ignoredList !== null) await loadIgnored();
      } catch (error) {
        console.error('Error ignoring transactions:', error);
        alert(
          `Failed to ignore transactions: ${error.message}\n\n` +
          'Nothing was changed and your note has been kept, so you can retry. ' +
          'If this says something "is not a function", the dev server is serving a stale ' +
          'bundle — restart it and reload.'
        );
      } finally {
        setIgnoring(false);
      }
    };

    const loadIgnored = async () => {
      try {
        setIgnoredLoading(true);
        const data = await fetchIgnoredTransactions();
        setIgnoredList(data.ignored || []);
      } catch (error) {
        console.error('Error loading ignored transactions:', error);
        alert('Failed to load ignored transactions: ' + error.message);
      } finally {
        setIgnoredLoading(false);
      }
    };

    const handleRestoreIgnored = async (ids) => {
      if (!ids.length) return;
      try {
        setIgnoredLoading(true);
        await restoreIgnoredTransactions(ids);
        await loadIgnored();
        await handleFetchTellerTransactions();
      } catch (error) {
        console.error('Error restoring transactions:', error);
        alert('Failed to restore: ' + error.message);
      } finally {
        setIgnoredLoading(false);
      }
    };
  
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-white">DEPLOYED_STAGE: {process.env.NEXT_PUBLIC_DEPLOYED_STAGE}</h1>
        <TellerLink />

        {summary && (
          <div className="mb-4 bg-gray-800 rounded-lg p-4 text-white">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">New to review</div>
                <div className="text-2xl font-bold text-green-400">{summary.newCount}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Already logged</div>
                <div className="text-2xl font-bold text-gray-300">{summary.alreadyLogged}</div>
                <div className="text-xs text-gray-500 mt-1">in your ledger</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Ignored</div>
                <div className="text-2xl font-bold text-amber-300">{summary.ignored ?? 0}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Excluded (payments)</div>
                <div className="text-2xl font-bold text-gray-300">{summary.excluded}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Outside window</div>
                <div className="text-2xl font-bold text-gray-300">{summary.outsideWindow}</div>
                {summary.outsideWindow > 0 && (
                  <div className="text-xs text-blue-400 mt-1">
                    older than {summary.windowStart}
                  </div>
                )}
              </div>
              {summary.possibleDuplicates > 0 && (
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Possible duplicates</div>
                  <div className="text-2xl font-bold text-amber-400">{summary.possibleDuplicates}</div>
                </div>
              )}
              {summary.pending > 0 && (
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Pending at Chase</div>
                  <div className="text-2xl font-bold text-blue-400">{summary.pending}</div>
                </div>
              )}
            </div>

            {summary.outsideWindow > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">
                  Can&apos;t find a transaction? {summary.outsideWindow} are older than{' '}
                  {summary.windowStart}. Look back further:
                </span>
                {['180', '365', 'all'].map((w) => (
                  w !== lookback && (
                    <button
                      key={w}
                      onClick={() => { setLookback(w); handleFetchTellerTransactions(w); }}
                      disabled={loading}
                      className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 rounded"
                    >
                      {w === 'all' ? 'All history' : w === '365' ? '1 year' : '180 days'}
                    </button>
                  )
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-gray-400">
              Scanned {summary.fetched} transactions from Chase
              {summary.windowStart
                ? ` dated ${summary.windowStart} or later`
                : ' across all available history'}
              . Matching is by transaction ID, so anything you leave unsaved will appear again
              next time.
              {summary.malformed > 0 && ` ${summary.malformed} were unreadable and skipped.`}
            </div>

            {summary.truncatedAccounts?.length > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                ⚠ Coverage incomplete for: {summary.truncatedAccounts.join(', ')} — hit the
                pagination limit, so older transactions on these accounts were not scanned.
              </div>
            )}
            {summary.rateLimitedAccounts?.length > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                ⚠ Chase/Teller rate-limited: {summary.rateLimitedAccounts.join(', ')} — wait a
                minute and fetch again to see the rest.
              </div>
            )}
            {summary.failedAccounts?.length > 0 && (
              <div className="mt-2 text-xs text-red-400">
                ⚠ Failed to fetch: {summary.failedAccounts.join(', ')} — results are incomplete.
              </div>
            )}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mb-4 text-white bg-gray-800 p-3 rounded-lg inline-block">
            Showing: <span className="font-bold">{filteredTransactions.length}</span>
            {filteredTransactions.length !== transactions.length && ` of ${transactions.length}`}
          </div>
        )}

        <div className="mb-4 flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-white">Look back:</label>
            <select
              value={lookback}
              onChange={(e) => {
                setLookback(e.target.value);
                handleFetchTellerTransactions(e.target.value);
              }}
              disabled={loading}
              className="bg-gray-700 text-white rounded px-3 py-1 border border-gray-600"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="all">All history (slow)</option>
            </select>
          </div>
          <button
            onClick={() => (ignoredList === null ? loadIgnored() : setIgnoredList(null))}
            className="text-sm text-amber-300 hover:text-amber-200 underline"
          >
            {ignoredList === null ? 'Show ignored' : 'Hide ignored'}
            {summary?.totalIgnored ? ` (${summary.totalIgnored})` : ''}
          </button>

          {lookback === 'all' && (
            <span className="text-xs text-amber-400 max-w-xl">
              All-history pages back through every account and takes ~30s. Chase may rate-limit
              it partway; if that happens the banner above will say which accounts were
              incomplete — just fetch again in a minute. The dated windows each take ~6s.
            </span>
          )}
        </div>

        <div className="mb-4 flex gap-4 flex-wrap">
          {/* <button
            onClick={handleFetchTransactions}
            disabled={loading || isProduction}
            className={`
              font-bold py-2 px-4 rounded transition-colors duration-200
              ${loading || isProduction
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-blue-500 hover:bg-blue-700 text-white'
              }
            `}
            title={isProduction ? 'Fetching transactions is disabled in production' : ''}
          >
            {loading ? 'Fetching...' : isProduction ? 'Fetch Disabled in Production' : 'Fetch MongoDB Transactions'}
          </button> */}
  
          <button
            onClick={() => handleFetchTellerTransactions()}
            disabled={loading}
            className={`
              font-bold py-2 px-4 rounded transition-colors duration-200
              ${loading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-purple-500 hover:bg-purple-700 text-white'
              }
            `}
          >
            {loading ? 'Fetching...' : 'Fetch Teller Transactions'}
          </button>
          
          {transactions.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                {allVisibleSelected ? 'Unselect All' : 'Select All'}
                {filteredTransactions.length !== transactions.length && ' (visible)'}
              </button>
  
              <button
                onClick={handleClearAll}
                disabled={selectedTransactions.size === 0}
                className={`${
                  selectedTransactions.size === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-700'
                } text-white font-bold py-2 px-4 rounded`}
              >
                Clear Selection ({selectedTransactions.size})
              </button>
  
              <button
                onClick={handleIgnoreSelected}
                disabled={ignoring || selectedVisibleCount === 0}
                title="Mark as reviewed and stop showing them. Does not save them. Reversible."
                className={`${
                  selectedVisibleCount === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700'
                } text-white font-bold py-2 px-4 rounded`}
              >
                {ignoring ? 'Ignoring...' : `Ignore Selected (${selectedVisibleCount})`}
              </button>
  
              <button
                onClick={handleSaveTransactions}
                disabled={saving || selectedVisibleCount === 0}
                className={`${
                  selectedVisibleCount === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-700'
                } text-white font-bold py-2 px-4 rounded`}
              >
                {saving ? 'Saving...' : `Save Selected (${selectedVisibleCount})`}
              </button>
            </>
          )}
        </div>

        {ignoredList !== null && (
          <div className="mb-4 bg-gray-900 border border-amber-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-bold">
                Ignored transactions ({ignoredList.length})
              </h2>
              {ignoredList.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(
                      `Restore all ${ignoredList.length} ignored transaction(s) to the review list?`
                    )) {
                      handleRestoreIgnored(ignoredList.map(i => i.tellerTransactionId));
                    }
                  }}
                  disabled={ignoredLoading}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Restore all
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Reviewed and deliberately not logged. These are filtered out of every fetch, and
              they are <span className="text-white">not</span> part of your ledger — they count
              toward no totals, returns or points. Restoring one puts it straight back in the
              review list.
            </p>

            {ignoredLoading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : ignoredList.length === 0 ? (
              <div className="text-gray-400 text-sm">
                Nothing ignored yet. Select rows above and press “Ignore Selected” to dismiss
                transactions you never want to log.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full text-white text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-1 text-left">Date</th>
                      <th className="px-3 py-1 text-right">Amount</th>
                      <th className="px-3 py-1 text-left">Card</th>
                      <th className="px-3 py-1 text-left">Description</th>
                      <th className="px-3 py-1 text-left">Note</th>
                      <th className="px-3 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ignoredList.map(item => (
                      <tr key={item.tellerTransactionId} className="border-t border-gray-700">
                        <td className="px-3 py-1 whitespace-nowrap">{item.date || '-'}</td>
                        <td className="px-3 py-1 text-right whitespace-nowrap">
                          {typeof item.amount === 'number'
                            ? `$${Math.abs(item.amount).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap">{item.paymentMethod || '-'}</td>
                        <td className="px-3 py-1 text-xs">{item.description || '-'}</td>
                        <td className="px-3 py-1 text-xs text-gray-400">{item.note || ''}</td>
                        <td className="px-3 py-1 text-right">
                          <button
                            onClick={() => handleRestoreIgnored([item.tellerTransactionId])}
                            disabled={ignoredLoading}
                            className="text-blue-400 hover:text-blue-300 underline whitespace-nowrap"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedVisibleCount > 0 && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <label htmlFor="ignore-note" className="text-sm text-gray-300 whitespace-nowrap">
              Note for “Ignore” (optional):
            </label>
            <input
              id="ignore-note"
              type="text"
              value={ignoreNote}
              onChange={(e) => setIgnoreNote(e.target.value)}
              placeholder="e.g. logged manually, or not my spending"
              className="bg-gray-700 text-white rounded px-3 py-1 border border-gray-600 flex-1 min-w-[240px] text-sm"
            />
            {ignoreNote && (
              <button
                onClick={() => setIgnoreNote('')}
                className="text-gray-400 hover:text-white text-sm"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {selectedVisibleDuplicates > 0 && (
          <div className="mb-4 text-sm text-amber-400">
            ⚠ {selectedVisibleDuplicates} of the {selectedVisibleCount} selected row
            {selectedVisibleCount === 1 ? ' is' : 's are'} flagged{' '}
            <span className="bg-amber-500 text-black px-1 rounded text-xs font-bold">DUP?</span>
            {' '}— hover the badge to see which existing entry it resembles.
          </div>
        )}

        <div className="mb-4 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-white">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 border border-gray-600"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
  
          <div className="flex items-center gap-2">
            <label className="text-white">Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 border border-gray-600"
            >
              {months.map(month => (
                <option key={month} value={month}>
                  {month === 'all' ? 'All Months' : `Month ${month}`}
                </option>
              ))}
            </select>
          </div>
  
          {(categoryFilter !== 'all' || monthFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setMonthFilter('all');
              }}
              className="text-gray-300 hover:text-white"
            >
              Clear Filters
            </button>
          )}
        </div>
  
        {loading ? (
          <div className="text-center text-gray-600">Loading transactions...</div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-black text-white border border-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 border border-gray-600">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                  </th>
                  <th className="px-4 py-2 border border-gray-600">Flags</th>
                  <th className="px-4 py-2 border border-gray-600">Year</th>
                  <th className="px-4 py-2 border border-gray-600">MM</th>
                  <th className="px-4 py-2 border border-gray-600">DD</th>
                  <th className="px-4 py-2 border border-gray-600">Amount</th>
                  <th className="px-4 py-2 border border-gray-600">Type</th>
                  <th className="px-4 py-2 border border-gray-600">Description</th>
                  <th className="px-4 py-2 border border-gray-600">Category</th>
                  <th className="px-4 py-2 border border-gray-600">Purchase Category</th>
                  <th className="px-4 py-2 border border-gray-600">Payment Method</th>
                  <th className="px-4 py-2 border border-gray-600">Points</th>
                  <th className="px-4 py-2 border border-gray-600">Payback</th>
                  <th className="px-4 py-2 border border-gray-600">Returned</th>
                  <th className="px-4 py-2 border border-gray-600">Return ID</th>
                  <th className="px-4 py-2 border border-gray-600">Notes</th>
                  <th className="px-4 py-2 border border-gray-600">ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.tellerTransactionId}
                    className={`hover:bg-gray-700 ${
                      transaction.possibleDuplicate ? 'bg-amber-950/40' : ''
                    }`}
                  >
                    <td className="px-4 py-2 border border-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.tellerTransactionId)}
                        onChange={() => handleCheckboxChange(transaction)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-2 border border-gray-600 whitespace-nowrap">
                      {transaction.possibleDuplicate && (
                        <span
                          title={transaction.duplicateReason || 'Possible duplicate'}
                          className="bg-amber-500 text-black px-2 py-0.5 rounded text-xs font-bold cursor-help"
                        >
                          DUP?
                        </span>
                      )}
                      {transaction.status === 'pending' && (
                        <span
                          title="Still pending at Chase — the amount or date may change when it posts."
                          className="ml-1 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold cursor-help"
                        >
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'year', transaction.year)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'month', transaction.month)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'date', transaction.day)}
                    </td>
                    <td className={`px-4 py-2 border border-gray-600 ${
                      transaction.transactionType === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {renderEditableCell(transaction, 'amount', `$${Math.abs(transaction.amount).toFixed(2)}`)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'transactionType', transaction.transactionType)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-xs">
                      {renderEditableCell(transaction, 'description', transaction.description)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'category', transaction.category)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'purchaseCategory', transaction.purchaseCategory)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'paymentMethod', transaction.paymentMethod)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'points', transaction.points)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'needToBePaidback', transaction.needToBePaidback)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'returned', transaction.returned)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-xs">
                      {renderEditableCell(transaction, 'returnId', transaction.returnId || '-')}
                    </td>
                    <td className="px-4 py-2 border border-gray-600">
                      {renderEditableCell(transaction, 'notes', transaction.notes)}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-xs">
                      {transaction.tellerTransactionId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-600">
            {statement}
          </div>
        )}
      </div>
    );
  }