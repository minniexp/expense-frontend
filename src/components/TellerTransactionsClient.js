'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTellerTransactionsWithAuth, saveTransactions } from '@/services/api';

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
  
    const handleSelectAll = () => {
      if (selectedTransactions.size === transactions.length) {
        // If all are selected, clear selection
        setSelectedTransactions(new Set());
      } else {
        // Select all transactions
        setSelectedTransactions(new Set(transactions.map(t => t.tellerTransactionId)));
      }
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
  
    const pointsOptions = [0, 1, 1.5, 3, 5, 7, 10];
  
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
  
    const handleFetchTellerTransactions = async () => {
      try {
        setLoading(true);
        const data = await fetchTellerTransactionsWithAuth();
        setTransactions(data);
        if (data.length === 0) {
          setStatement('No transactions found matching the selected filters.');
        } else {
          setStatement('Press Fetch Teller Transactions');
        }
      } catch (error) {
        console.error('Error fetching Teller transactions:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleSaveTransactions = async () => {
      if (selectedTransactions.size === 0) {
        alert('Please select transactions to save');
        return;
      }
  
      if (selectedTransactions.size > transactions.length) {
        alert('There is an issue with selections. Close the page and try again.');
        return;
      }
  
      const selectedTransactionData = transactions.filter(t => 
        selectedTransactions.has(t.tellerTransactionId)
      );
    //   console.log('Selected Transactions REQUEST CALL:', Array.from(selectedTransactionData));
  
      try {
        setSaving(true);
        const response = await saveTransactions(selectedTransactionData);
        
        setSelectedTransactions(new Set());
        alert('Transactions saved successfully!');
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
  
    const handleRemoveSelected = () => {
      if (selectedTransactions.size === 0) {
        alert('Please select transactions to remove');
        return;
      }
  
      const confirmDelete = window.confirm(`Are you sure you want to remove ${selectedTransactions.size} transaction(s)?`);
      
      if (confirmDelete) {
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => 
            !selectedTransactions.has(transaction.tellerTransactionId)
          )
        );
        setSelectedTransactions(new Set()); // Clear selections after removal
      }
    };
  
    // Get unique categories from transactions
    const categories = ['all', ...new Set(transactions.map(t => t.category))].filter(Boolean);
    const months = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  
    // Filter transactions based on selected filters
    const filteredTransactions = transactions.filter(transaction => {
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesMonth = monthFilter === 'all' || transaction.month.toString().padStart(2, '0') === monthFilter;
      return matchesCategory && matchesMonth;
    });
  
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-white">DEPLOYED_STAGE: {process.env.NEXT_PUBLIC_DEPLOYED_STAGE}</h1>
        {transactions.length > 0 && (
          <div className="mb-4 text-white bg-gray-800 p-3 rounded-lg inline-block">
            Total Transactions: <span className="font-bold">{transactions.length}</span>
          </div>
        )}
        
        <div className="mb-4 flex gap-4">
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
            onClick={handleFetchTellerTransactions}
            disabled={loading || isProduction}
            className={`
              font-bold py-2 px-4 rounded transition-colors duration-200
              ${loading || isProduction
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-purple-500 hover:bg-purple-700 text-white'
              }
            `}
            title={isProduction ? 'Fetching transactions is disabled in production' : ''}
          >
            {loading ? 'Fetching...' : isProduction ? 'Fetch Disabled in Production' : 'Fetch Teller Transactions'}
          </button>
          
          {transactions.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                {selectedTransactions.size === transactions.length ? 'Unselect All' : 'Select All'}
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
                onClick={handleRemoveSelected}
                disabled={selectedTransactions.size === 0}
                className={`${
                  selectedTransactions.size === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-700 hover:bg-red-800'
                } text-white font-bold py-2 px-4 rounded`}
              >
                Remove Selected ({selectedTransactions.size})
              </button>
  
              <button
                onClick={handleSaveTransactions}
                disabled={saving || selectedTransactions.size === 0}
                className={`${
                  selectedTransactions.size === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-700'
                } text-white font-bold py-2 px-4 rounded`}
              >
                {saving ? 'Saving...' : `Save Selected (${selectedTransactions.size})`}
              </button>
            </>
          )}
        </div>
  
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
                      checked={transactions.length > 0 && selectedTransactions.size === transactions.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                  </th>
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
                  <tr key={transaction.tellerTransactionId} className="hover:bg-gray-700">
                    <td className="px-4 py-2 border border-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.tellerTransactionId)}
                        onChange={() => handleCheckboxChange(transaction)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                      />
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