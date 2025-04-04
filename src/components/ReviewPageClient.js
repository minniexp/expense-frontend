'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { PAYMENT_METHODS, CATEGORIES, PURCHASE_CATEGORIES, POINTS_OPTIONS, MONTH_NAMES } from '@/utils/constants';
import { fetchMongoDBTransactions, fetchAvailableReturns, updateManyTransactions, createReturnDocument, fetchReturnById, updateReturnDocumentById } from '@/services/api';

export default function ReviewPage({initialTransactions, initialReturns}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const isProduction = process.env.NEXT_PUBLIC_DEPLOYED_STAGE === 'production';
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuarters, setExpandedQuarters] = useState(new Set());
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [newReturnData, setNewReturnData] = useState({
    date: '',
    total: 0,
    description: '',
    lenderUserId: '67b5395665f7131970e30e4b', // Default to Min
    payeeUserId: '',
    returnedTransactionIds: [],
    returnedTellerTransactionIds: [],
    paidBackConfirmationPayee: false,
    paidBackConfirmationLender: false
  });
  const [savingReturn, setSavingReturn] = useState(false);
  const modalRef = useRef(null);
  const [availableReturns, setAvailableReturns] = useState(initialReturns);

  // Updated filteredTransactions with amount search
  const filteredTransactions = transactions
    // Month filter
    .filter(t => selectedMonth === 'all' ? true : t.month === selectedMonth)
    // Category filter
    .filter(t => categoryFilter === 'all' ? true : t.category === categoryFilter)
    // Transaction type filter
    .filter(t => transactionTypeFilter === 'all' ? true : t.transactionType === transactionTypeFilter)
    // Payment method filter
    .filter(t => paymentMethodFilter === 'all' ? true : t.paymentMethod === paymentMethodFilter)
    // Search term filter with amount
    .filter(t => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const amountStr = Math.abs(t.amount).toFixed(2);
      return (
        t.description?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.paymentMethod?.toLowerCase().includes(searchLower) ||
        amountStr.includes(searchTerm) // Add amount search
      );
    });

  // Replace hardcoded arrays with imports
  const categoryOptions = CATEGORIES;
  const purchaseCategoryOptions = PURCHASE_CATEGORIES;
  const pointsOptions = POINTS_OPTIONS;

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      // If all filtered transactions are selected, clear selection
      setSelectedTransactions(new Set());
    } else {
      // Select all filtered transactions
      setSelectedTransactions(new Set(filteredTransactions.map(t => t._id)));
    }
  };

  const handleCheckboxChange = (transaction) => {
    setSelectedTransactions(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(transaction._id)) {
        console.log('Removing transaction:', transaction._id);
        newSelected.delete(transaction._id);
      } else {
        console.log('Adding transaction:', transaction._id);
        newSelected.add(transaction._id);
      }
      return newSelected;
    });
  };

  // Add effect to monitor selectedTransactions changes
  useEffect(() => {
    console.log('Selected transactions:', Array.from(selectedTransactions));
  }, [selectedTransactions]);

  // Add cell edit handler
  const handleCellEdit = (transactionId, field, value) => {
    setTransactions(prevTransactions => {
      return prevTransactions.map(transaction => 
        transaction._id === transactionId 
          ? { ...transaction, [field]: value }
          : transaction
      );
    });
  };

  // Add render functions for different cell types
  const renderPointsSelector = (transaction, currentPoints) => {
    return (
      <div className="absolute z-10 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-600 min-w-[200px]">
        <div className="grid grid-cols-3 gap-2">
          {pointsOptions.map(points => (
            <button
              key={points}
              onClick={() => {
                handleCellEdit(transaction._id, 'points', points);
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
                handleCellEdit(transaction._id, 'purchaseCategory', newCategories);
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
    const isEditing = editingCell === `${transaction._id}-${field}`;
    
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
            onChange={(e) => handleCellEdit(transaction._id, field, parseInt(e.target.value))}
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
              handleCellEdit(transaction._id, field, newValue);
            }}
            onBlur={() => setEditingCell(null)}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      } else if (field === 'category') {
        return (
          <select
            autoFocus
            className="bg-gray-700 text-white p-1 w-full"
            value={value || ''}
            onChange={(e) => handleCellEdit(transaction._id, field, e.target.value)}
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
            onChange={(e) => handleCellEdit(transaction._id, field, e.target.value)}
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
      } else if (field === 'returnId') {
        return (
          <div className="relative">
            <select
              autoFocus
              className="bg-gray-700 text-white p-1 w-full"
              value={value || ''}
              onChange={(e) => handleAssignReturn(transaction, e.target.value || null)}
              onBlur={() => setEditingCell(null)}
            >
              <option value="">None</option>
              {availableReturns.map(ret => (
                <option key={ret._id} value={ret._id}>
                  {ret.description || `Return ${new Date(ret.date).toLocaleDateString()}`}
                </option>
              ))}
            </select>
          </div>
        );
      } else {
        return (
          <input
            autoFocus
            className="bg-gray-700 text-white p-1 w-full"
            value={value || ''}
            onChange={(e) => handleCellEdit(transaction._id, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
          />
        );
      }
    }

    // Non-editing state
    if (field === 'purchaseCategory') {
      return (
        <div 
          className="cursor-pointer flex flex-wrap gap-1 min-h-[24px]"
          onClick={() => setEditingCell(`${transaction._id}-${field}`)}
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
          onClick={() => setEditingCell(`${transaction._id}-${field}`)}
        >
          {value ? 'Yes' : 'No'}
        </div>
      );
    }

    if (field === 'points') {
      return (
        <div 
          className="cursor-pointer"
          onClick={() => setEditingCell(`${transaction._id}-${field}`)}
        >
          <span className={`px-2 py-0.5 rounded text-sm ${
            value > 0 ? 'bg-blue-500 text-white' : 'text-gray-400'
          }`}>
            {value}
          </span>
        </div>
      );
    }

    // Return ID is already handled correctly
    if (field === 'returnId') {
      return (
        <div 
          className="cursor-pointer flex items-center"
          onClick={() => setEditingCell(`${transaction._id}-${field}`)}
        >
          {transaction.returnDescription ? (
            <span className="bg-blue-700 text-white px-2 py-1 rounded text-sm">
              {transaction.returnDescription}
            </span>
          ) : value ? (
            <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-sm">
              {value}
            </span>
          ) : (
            <span className="text-gray-400">Click to assign</span>
          )}
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer"
        onClick={() => setEditingCell(`${transaction._id}-${field}`)}
      >
        {Array.isArray(value) ? value.join(', ') || '-' : value || '-'}
      </div>
    );
  };

  const handleUpdateSelectedTransactions = async () => {
    console.log("handleUpdateSelectedTransactions");
    console.log("selectedTransactions", selectedTransactions);

    if (selectedTransactions.size === 0) {
      alert('Please select transactions to update');
      return;
    }

    try {
      setLoading(true);
      const selectedTransactionData = transactions.filter(t => 
        selectedTransactions.has(t._id)
      );

      // Store original transaction data for comparison
      const originalTransactions = {};
      transactions.forEach(t => {
        if (selectedTransactions.has(t._id)) {
          originalTransactions[t._id] = { ...t };
        }
      });

      // Track return documents that need updates
      const affectedReturns = new Set();

      console.log("calling updateManyTransactions");
      // First, update the transactions
      const response = await updateManyTransactions(selectedTransactionData);
      console.log("updateManyTransactions response", response);
      if (!response.ok) {
        throw new Error(`Failed to update transactions: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Process return document updates
      for (const transaction of selectedTransactionData) {
        const originalTransaction = originalTransactions[transaction._id];
        
        // Skip if no change in return ID
        if (!originalTransaction || originalTransaction.returnId === transaction.returnId) {
          continue;
        }
        
        // Handle removal from original return document
        if (originalTransaction.returnId) {
          await updateReturnDocument(originalTransaction.returnId, originalTransaction, false);
          affectedReturns.add(originalTransaction.returnId);
        }
        
        // Handle addition to new return document
        if (transaction.returnId) {
          await updateReturnDocument(transaction.returnId, transaction, true);
          affectedReturns.add(transaction.returnId);
        }
      }
      
      if (result.successful?.length > 0) {
        alert(`Successfully updated ${result.successful.length} transactions${affectedReturns.size > 0 ? ` and ${affectedReturns.size} return documents` : ''}`);
        
        // Refresh data
        const updatedTransactions = await fetchMongoDBTransactions();
        setTransactions(updatedTransactions);
        
        if (affectedReturns.size > 0) {
          const updatedReturns = await fetchAvailableReturns();
          setAvailableReturns(updatedReturns);
        }
      }

      if (result.failed?.length > 0) {
        alert(`Failed to update ${result.failed.length} transactions`);
        console.error('Failed updates:', result.failed);
      }
    } catch (error) {
      console.error('Error updating transactions:', error);
      alert(`Error updating transactions: ${error.message}`);
    } finally {
      setLoading(false);
      setSelectedTransactions(new Set());
    }
  };

  // Update getSelectedMonthSummary function to work for both specific months and all months
  const getSelectedMonthSummary = () => {
    const allCategories = CATEGORIES;
    const summary = {};
    
    // Initialize all categories with 0
    allCategories.forEach(category => {
      summary[category] = 0;
    });

    // For both "all" and specific month selection
    let transactionsToCalculate = transactions;
    if (selectedMonth !== 'all') {
      transactionsToCalculate = transactions.filter(t => t.month === selectedMonth);
    }
    
    // Calculate summary for the filtered transactions
    transactionsToCalculate.forEach(transaction => {
      const category = transaction.category || 'uncategorized';
      const amount = transaction.transactionType === 'expense' 
        ? -Math.abs(transaction.amount) 
        : Math.abs(transaction.amount);
      summary[category] = (summary[category] || 0) + amount;
    });

    return summary;
  };

  // New function to get payment method summary
  const getPaymentMethodSummary = () => {
    const summary = {};
    
    // Initialize all payment methods with 0
    PAYMENT_METHODS.forEach(method => {
      summary[method] = 0;
    });

    // Calculate for selected month or all months
    let transactionsToCalculate = transactions;
    if (selectedMonth !== 'all') {
      transactionsToCalculate = transactions.filter(t => t.month === selectedMonth);
    }
    
    transactionsToCalculate.forEach(transaction => {
      const method = transaction.paymentMethod;
      if (method) {
        const amount = Math.abs(transaction.amount);
        summary[method] = (summary[method] || 0) + amount;
      }
    });

    // Filter out payment methods with 0 amount
    return Object.fromEntries(
      Object.entries(summary).filter(([_, amount]) => amount > 0)
    );
  };

  // Add toggle function for month expansion
  const toggleMonthExpansion = (month) => {
    setExpandedMonths(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(month)) {
        newExpanded.delete(month);
      } else {
        newExpanded.add(month);
      }
      return newExpanded;
    });
  };

  // Get unique payment methods helper
  const getUniquePaymentMethods = () => {
    const methods = new Set(transactions.map(t => t.paymentMethod));
    return Array.from(methods).filter(Boolean).sort();
  };

  // New helper function to determine which quarter a month belongs to
  const getQuarterForMonth = (month) => {
    if (month >= 1 && month <= 3) return 1;
    if (month >= 4 && month <= 6) return 2;
    if (month >= 7 && month <= 9) return 3;
    return 4;
  };

  // New function to get months in a quarter
  const getMonthsInQuarter = (quarter) => {
    switch (quarter) {
      case 1: return [1, 2, 3];
      case 2: return [4, 5, 6];
      case 3: return [7, 8, 9];
      case 4: return [10, 11, 12];
      default: return [];
    }
  };

  // New function to toggle quarter expansion
  const toggleQuarterExpansion = (quarter) => {
    setExpandedQuarters(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(quarter)) {
        newExpanded.delete(quarter);
      } else {
        newExpanded.add(quarter);
      }
      return newExpanded;
    });
  };

  // Update the existing getQuarterlyPaymentMethodSummary function to calculate points correctly
  const getQuarterlyPaymentMethodSummary = (quarter) => {
    const summary = {};
    const quarterMonths = getMonthsInQuarter(quarter);
    const targetCards = ['Freedom', 'Freedom Flex']; // Only get data for these cards
    
    // Initialize only the target cards with 0
    targetCards.forEach(method => {
      summary[method] = {
        totalAmount: 0,
        transactionCount: 0,
        monthlyAmounts: Object.fromEntries(quarterMonths.map(month => [month, 0])),
        points: 0
      };
    });

    // Calculate for the quarter - filter for Freedom cards only
    transactions
      .filter(t => quarterMonths.includes(t.month) && targetCards.includes(t.paymentMethod))
      .forEach(transaction => {
        const method = transaction.paymentMethod;
        const amount = Math.abs(transaction.amount);
        const month = transaction.month;
        const pointValue = transaction.points || 0;
        
        // Update the summary
        summary[method].totalAmount += amount;
        summary[method].transactionCount += 1;
        summary[method].monthlyAmounts[month] = (summary[method].monthlyAmounts[month] || 0) + amount;
        
        // Calculate points by multiplying amount * point value for each transaction
        const earnedPoints = amount * pointValue;
        summary[method].points += earnedPoints;
      });

    // Only return cards that have transaction data
    return Object.fromEntries(
      Object.entries(summary).filter(([_, data]) => data.totalAmount > 0)
    );
  };

  // New function to get the current quarter based on selected month
  const getCurrentQuarter = () => {
    if (selectedMonth === 'all') return null;
    return getQuarterForMonth(selectedMonth);
  };

  const handleCreateReturnClick = () => {
    const selectedTransactionData = transactions.filter(t => 
      selectedTransactions.has(t._id)
    );
    
    if (selectedTransactionData.length === 0) {
      alert('Please select at least one transaction');
      return;
    }
    
    // Sort transactions by date (ascending) to get the earliest one for the default date
    const sortedTransactions = [...selectedTransactionData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const firstTransaction = sortedTransactions[0];
    
    // Calculate total from all selected transactions
    const total = selectedTransactionData.reduce(
      (sum, t) => sum + Math.abs(t.amount), 0
    );
    
    // Extract transaction IDs
    const mongoIds = selectedTransactionData.map(t => t._id);
    const tellerIds = selectedTransactionData
      .map(t => t.tellerTransactionId)
      .filter(id => id); // Filter out undefined or empty IDs
    
    // Set the initial data for the form
    setNewReturnData({
      date: firstTransaction.date,
      total: total,
      description: '',
      lenderUserId: '67b5395665f7131970e30e4b', // Default to Min
      payeeUserId: '',
      returnedTransactionIds: mongoIds,
      returnedTellerTransactionIds: tellerIds,
      paidBackConfirmationPayee: false,
      paidBackConfirmationLender: false
    });
    
    // Show the modal
    setShowReturnModal(true);
  };

  const handleCreateReturn = async () => {
    // Validate form
    if (!newReturnData.total || !newReturnData.lenderUserId || !newReturnData.payeeUserId) {
      alert('Please fill in all required fields: Amount, Lender, and Payee');
      return;
    }
    
    try {
      setSavingReturn(true);
      
      // Create the return document
      const createdReturn = await createReturnDocument({
        ...newReturnData,
        total: parseFloat(newReturnData.total)
      });
      
      // Get the new return document's MongoDB ID
      const newReturnId = createdReturn._id;
      
      if (newReturnId) {
        // Collect the IDs of the transactions that need to be updated
        const transactionIdsToUpdate = [...newReturnData.returnedTransactionIds];
        
        // Now update all selected transactions with the new return ID
        const selectedTransactionData = transactions
          .filter(t => selectedTransactions.has(t._id))
          .map(t => ({
            ...t,
            returnId: newReturnId,
            returned: true
          }));
        
        // Update the transactions in the backend
        if (selectedTransactionData.length > 0) {
          try {
            await updateManyTransactions(selectedTransactionData)

          } catch (updateError) {
            console.error('Error updating transaction return IDs:', updateError);
          }
        }
      }
      
      // Close the modal and show success message
      setShowReturnModal(false);
      alert('Return document created successfully!');
      
      // Clear selection
      setSelectedTransactions(new Set());
      
      // Refresh transactions to get updated data
      await fetchMongoDBTransactions();
    } catch (error) {
      console.error('Error creating return document:', error);
      alert(`Failed to create return document: ${error.message}`);
    } finally {
      setSavingReturn(false);
    }
  };

  // Add click outside listener for modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowReturnModal(false);
      }
    }
    
    if (showReturnModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReturnModal]);

  // Add a function to handle return assignment
  const handleAssignReturn = async (transaction, returnId) => {
    try {
      // Store original state for comparison
      const originalReturnId = transaction.returnId;
      
      // Skip if no change
      if (originalReturnId === returnId) {
        setEditingCell(null);
        return;
      }
      
      const updatedTransaction = {
        ...transaction,
        returnId: returnId || null,
        returned: returnId ? true : false
      };
      
    //   console.log(`Moving transaction ${transaction._id} from return ${originalReturnId || 'none'} to ${returnId || 'none'}`);
      
      // Update the transaction in the database
      await updateManyTransactions([updatedTransaction])
      
      
      // Update local state
      setTransactions(prevTransactions => 
        prevTransactions.map(t => 
          t._id === transaction._id ? updatedTransaction : t
        )
      );
      
      // If the transaction was previously assigned to a return, remove it from that return and subtract amount
      if (originalReturnId) {
        await updateReturnDocument(originalReturnId, transaction, false);
        // console.log(`Removed from original return ${originalReturnId} and subtracted amount ${Math.abs(transaction.amount)}`);
      }
      
      // If the transaction is being assigned to a new return, add it to that return and add amount
      if (returnId) {
        await updateReturnDocument(returnId, transaction, true);
        // console.log(`Added to new return ${returnId} and added amount ${Math.abs(transaction.amount)}`);
      }
      
      setEditingCell(null);
      
    } catch (error) {
      console.error('Error assigning return:', error);
      alert(`Error updating transaction: ${error.message}`);
    }
  };

  // Add helper function to update return documents
  const updateReturnDocument = async (returnId, transaction, isAdding) => {
    try {
      // First fetch the current return document
      const returnResponse = await fetchReturnById(returnId)
            
      // Calculate the amount change based on whether we're adding or removing
      const amountChange = isAdding 
        ? Math.abs(transaction.amount) // Add the amount if adding the transaction
        : -Math.abs(transaction.amount); // Subtract the amount if removing the transaction
      
      // Create the updated return document
      const updatedReturn = {
        ...returnResponse,
        total: Math.max(0, parseFloat((returnResponse.total + amountChange).toFixed(2)))
      };
      
      // Update transaction IDs arrays
      if (isAdding) {
        // Adding the transaction ID if it's not already in the array
        if (!returnResponse.returnedTransactionIds || !returnResponse.returnedTransactionIds.includes(transaction._id)) {
          updatedReturn.returnedTransactionIds = [
            ...(returnResponse.returnedTransactionIds || []),
            transaction._id
          ];
        }
        
        // Adding the teller transaction ID if it exists and is not already in the array
        if (transaction.tellerTransactionId) {
          if (!returnResponse.returnedTellerTransactionIds || !returnResponse.returnedTellerTransactionIds.includes(transaction.tellerTransactionId)) {
            updatedReturn.returnedTellerTransactionIds = [
              ...(returnResponse.returnedTellerTransactionIds || []),
              transaction.tellerTransactionId
            ];
          }
        }
      } else {
        // Removing the transaction ID but keeping other transaction IDs
        updatedReturn.returnedTransactionIds = (returnResponse.returnedTransactionIds || [])
          .filter(id => id !== transaction._id);
          
        // Removing the teller transaction ID if it exists but keeping other teller IDs
        if (transaction.tellerTransactionId) {
          updatedReturn.returnedTellerTransactionIds = (returnResponse.returnedTellerTransactionIds || [])
            .filter(id => id !== transaction.tellerTransactionId);
        }
      }
      
      // Update the return document in the database
      const updateReturnResponse = await updateReturnDocumentById(returnId, updatedReturn) 
      if (updateReturnResponse) {
        // console.log(`Successfully ${isAdding ? 'added to' : 'removed from'} return ${returnId}`);
        // Log the amount change for debugging
        console.log(`Amount change: ${amountChange.toFixed(2)}, New total: ${updatedReturn.total}`);
        
        // Fetch the updated returns to refresh the UI
        await fetchAvailableReturns();
      }
    } catch (err) {
      console.error(`Error updating return ${returnId}:`, err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => router.push('/navigation')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Go to Navigation
        </button>

        <button
          onClick={fetchMongoDBTransactions}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Transactions
        </button>

        {transactions.length > 0 && (
          <>
            <button
              onClick={handleSelectAll}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              {selectedTransactions.size === filteredTransactions.length ? 'Unselect All' : 'Select All'}
            </button>

            <button
              onClick={handleUpdateSelectedTransactions}
              disabled={selectedTransactions.size === 0}
              className={`
                font-bold py-2 px-4 rounded transition-colors duration-200
                ${selectedTransactions.size === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-700 text-white'
                }
              `}
            >
              {selectedTransactions.size === 0 ? 'Update' : `Update Selected (${selectedTransactions.size})`}
            </button>
            
            <button
              onClick={handleCreateReturnClick}
              disabled={loading || selectedTransactions.size === 0}
              className={`
                font-bold py-2 px-4 rounded transition-colors duration-200
                ${selectedTransactions.size === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-700 text-white'
                }
              `}
            >
              Create New Return Doc
            </button>
          </>
        )}
      </div>

      {/* Updated Month Filter with Summaries */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Filter by Month</h2>
        
        {/* Month Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
              selectedMonth === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            All Months
          </button>
          {Object.entries(MONTH_NAMES).map(([month, name]) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(Number(month))}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                selectedMonth === Number(month)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Category Summary - Only shown when a specific month is selected or All Months */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-bold text-white text-lg mb-4 border-b border-gray-500 pb-2">
              {selectedMonth === 'all' ? 'All Year' : MONTH_NAMES[selectedMonth]} Category Summary
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map((category, index) => {
                const amount = getSelectedMonthSummary()[category] || 0;
                if (amount === 0) return null; // Skip categories with 0 amount
                return (
                  <div 
                    key={category} 
                    className={`flex justify-between text-sm p-2 rounded ${
                      index % 2 === 0 ? 'bg-gray-600' : 'bg-gray-700'
                    } hover:bg-gray-500 transition-colors duration-200`}
                  >
                    <span className="text-gray-300 flex-1">{category}</span>
                    <div className="flex items-center gap-2 min-w-[100px] justify-end">
                      <div className="h-px bg-gray-500 w-8"></div>
                      <span className={`
                        font-mono
                        ${amount < 0 ? 'text-red-400' : 
                          amount > 0 ? 'text-green-400' : 
                          'text-gray-400'}
                      `}>
                        ${Math.abs(amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 pt-4 border-t border-gray-500">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className={
                    Object.values(getSelectedMonthSummary()).reduce((a, b) => a + b, 0) < 0 
                      ? 'text-red-400' 
                      : 'text-green-400'
                  }>
                    ${Math.abs(Object.values(getSelectedMonthSummary()).reduce((a, b) => a + b, 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* NEW: Payment Method Summary */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-bold text-white text-lg mb-4 border-b border-gray-500 pb-2">
              {selectedMonth === 'all' ? 'All Year' : MONTH_NAMES[selectedMonth]} Payment Method Summary
            </h3>
            <div className="space-y-1">
              {Object.entries(getPaymentMethodSummary()).map(([method, amount], index) => {
                return (
                  <div 
                    key={method} 
                    className={`flex justify-between text-sm p-2 rounded ${
                      index % 2 === 0 ? 'bg-gray-600' : 'bg-gray-700'
                    } hover:bg-gray-500 transition-colors duration-200`}
                  >
                    <span className="text-gray-300 flex-1">{method}</span>
                    <div className="flex items-center gap-2 min-w-[100px] justify-end">
                      <div className="h-px bg-gray-500 w-8"></div>
                      <span className="font-mono text-red-400">
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 pt-4 border-t border-gray-500">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Spending</span>
                  <span className="text-red-400">
                    ${Object.values(getPaymentMethodSummary()).reduce((a, b) => a + b, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update the Quarterly Payment Method Summary to focus on Freedom cards */}
      {selectedMonth !== 'all' && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">
            Freedom Cards - Q{getCurrentQuarter()} Summary
          </h2>
          
          <div className="mb-4">
            <p className="text-gray-300">
              This shows spending patterns for Freedom cards across the quarter
              {getCurrentQuarter() === 1 ? ' (January, February, March)' : 
               getCurrentQuarter() === 2 ? ' (April, May, June)' : 
               getCurrentQuarter() === 3 ? ' (July, August, September)' : 
               ' (October, November, December)'}
            </p>
            {getCurrentQuarter() === 1 && (
              <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 rounded border border-blue-700 text-blue-300 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Bonus Category Alert:</span>
                </div>
                <div className="mt-1 ml-5">
                  Freedom & Freedom Flex earn 5% cashback on grocery purchases during Q1 (January-March)
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {Object.entries(getQuarterlyPaymentMethodSummary(getCurrentQuarter())).length > 0 ? (
              Object.entries(getQuarterlyPaymentMethodSummary(getCurrentQuarter()))
                .sort(([_, dataA], [__, dataB]) => dataB.totalAmount - dataA.totalAmount)
                .map(([method, data], index) => {
                  const isExpanded = expandedQuarters.has(method);
                  
                  return (
                    <div key={method} className="bg-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-600"
                        onClick={() => toggleQuarterExpansion(method)}
                      >
                        <div className="flex items-center">
                          <span className="px-3 py-1 rounded-full mr-3 text-sm font-medium bg-blue-500 text-white">
                            {method}
                          </span>
                          <span className="font-medium text-white">
                            ${data.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-gray-400 text-sm ml-2">
                            ({data.transactionCount} transactions)
                          </span>
                        </div>
                        <div className="flex items-center">
                          {data.points > 0 && (
                            <span className="px-2 py-1 bg-green-600 text-white rounded-full text-xs mr-3">
                              {data.points.toFixed(0)} pts (${(data.points / 100).toFixed(2)} value)
                            </span>
                          )}
                          <svg 
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-600">
                          <div className="grid grid-cols-3 gap-2">
                            {getMonthsInQuarter(getCurrentQuarter()).map(month => (
                              <div 
                                key={month} 
                                className={`p-2 rounded ${
                                  selectedMonth === month ? 'bg-gray-500' : 'bg-gray-600'
                                }`}
                              >
                                <div className="text-sm text-gray-300">{MONTH_NAMES[month]}</div>
                                <div className="font-medium text-white">
                                  ${data.monthlyAmounts[month].toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            ) : (
              <div className="text-center text-gray-400 py-4">
                No transactions found for Freedom cards in this quarter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Annual Card Summary to focus on Freedom cards */}
      {selectedMonth === 'all' && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white">Freedom Cards - Annual Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(quarter => {
              const quarterSummary = getQuarterlyPaymentMethodSummary(quarter);
              const totalSpent = Object.values(quarterSummary).reduce((sum, data) => sum + data.totalAmount, 0);
              const hasData = Object.keys(quarterSummary).length > 0;
              
              return (
                <div key={quarter} className={`bg-gray-700 p-4 rounded-lg ${quarter === 1 ? 'border-2 border-blue-500' : ''}`}>
                  <h3 className="font-bold text-white border-b border-gray-500 pb-2">
                    Q{quarter} - {getMonthsInQuarter(quarter).map(m => MONTH_NAMES[m].substring(0, 3)).join(', ')}
                  </h3>
                  
                  {hasData ? (
                    <>
                      <div className="mt-3 text-lg font-bold text-white flex justify-between items-center">
                        <span>Total:</span> <span>${totalSpent.toFixed(2)}</span>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        {Object.entries(quarterSummary)
                          .map(([method, data]) => (
                            <div key={method} className="flex justify-between items-center">
                              <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">
                                {method}
                              </span>
                              <span className="text-gray-300">${data.totalAmount.toFixed(2)}</span>
                            </div>
                          ))}
                      </div>

                      {quarter === 1 && (
                        <div className="mt-3 text-xs text-blue-300">
                          5% cashback on groceries in Q1
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 text-sm text-gray-400 py-6 text-center">
                      No transactions found
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Table Filters */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Filter Transactions</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Category Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Type</label>
            <select
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              {getUniquePaymentMethods().map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Updated Search Input */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, amount, etc..."
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Stats */}
        <div className="text-gray-400 text-sm">
          Showing {filteredTransactions.length} of {transactions.length} transactions
          {categoryFilter !== 'all' && ` • Category: ${categoryFilter}`}
          {transactionTypeFilter !== 'all' && ` • Type: ${transactionTypeFilter}`}
          {paymentMethodFilter !== 'all' && ` • Method: ${paymentMethodFilter}`}
          {searchTerm && ` • Search: "${searchTerm}"`}
        </div>

        {/* Clear Filters Button */}
        {(categoryFilter !== 'all' || transactionTypeFilter !== 'all' || 
          paymentMethodFilter !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setCategoryFilter('all');
              setTransactionTypeFilter('all');
              setPaymentMethodFilter('all');
              setSearchTerm('');
            }}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Clear all filters
          </button>
        )}
      </div>

      {filteredTransactions.length > 0 ? (
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
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2">MM</th>
                <th className="px-4 py-2">DD</th>                
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Purchase Category</th>
                <th className="px-4 py-2">Payment Method</th>
                <th className="px-4 py-2">Points</th>
                <th className="px-4 py-2">Transaction Type</th>
                <th className="px-4 py-2">Return</th>
                <th className="px-4 py-2">Returned</th>
                <th className="px-4 py-2">Need To Be Paid Back</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">User ID</th>
                <th className="px-4 py-2">Teller Transaction ID</th>
                <th className="px-4 py-2">MongoDB ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction._id} className="border-t border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction._id)}
                      onChange={() => handleCheckboxChange(transaction)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'year', transaction.year)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'month', transaction.month)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'day', transaction.day)}
                  </td>
                  <td className={`px-4 py-2 ${
                    transaction.transactionType === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {renderEditableCell(transaction, 'amount', Math.abs(transaction.amount).toFixed(2))}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'description', transaction.description)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'category', transaction.category)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'purchaseCategory', transaction.purchaseCategory)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'paymentMethod', transaction.paymentMethod)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'points', transaction.points)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'transactionType', transaction.transactionType)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'returnId', transaction.returnId)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'returned', transaction.returned)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'needToBePaidback', transaction.needToBePaidback)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'notes', transaction.notes)}
                  </td>
                  <td className="px-4 py-2">
                    {renderEditableCell(transaction, 'userId', transaction.userId)}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">
                    {transaction.tellerTransactionId || '-'}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{transaction._id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          No transactions found for {selectedMonth === 'all' ? 'All Months' : MONTH_NAMES[selectedMonth]}.
        </div>
      )}

      {showReturnModal && (
        <ReturnFormModal 
          newReturnData={newReturnData}
          setNewReturnData={setNewReturnData}
          onClose={() => setShowReturnModal(false)}
          onSubmit={handleCreateReturn}
          isLoading={savingReturn}
          modalRef={modalRef}
        />
      )}
    </div>
  );
}

// Return Form Modal Component
function ReturnFormModal({ 
  newReturnData, 
  setNewReturnData, 
  onClose, 
  onSubmit, 
  isLoading,
  modalRef
}) {
  // Format date string for DatePicker
  const [selectedDate, setSelectedDate] = useState(
    newReturnData.date ? new Date(newReturnData.date) : new Date()
  );
  
  // Update the date in form data when date picker changes
  const handleDateChange = (date) => {
    setSelectedDate(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    setNewReturnData(prev => ({
      ...prev,
      date: dateString
    }));
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewReturnData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Predefined user options
  const userOptions = [
    { id: '67b5395665f7131970e30e4b', name: 'Min' },
    { id: '67b5398665f7131970e30e4e', name: 'Dad Account' },
    { id: '67b539aa65f7131970e30e51', name: 'Mom Account' },
    { id: '67e4c35710c0d9d2d0cc9b08', name: 'SHAM'},
    { id: '67e4c38410c0d9d2d0cc9b0b', name: 'YEEM'},
    { id: '67e4c39d10c0d9d2d0cc9b0e', name: 'friend'},
    { id: '67e4c3bf10c0d9d2d0cc9b11', name: 'AKM'},
    { id: '67e4c3dc10c0d9d2d0cc9b14', name: 'Kat'}
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Create New Return Document</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date*</label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              className="bg-gray-700 text-white rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Total Amount*</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="total"
                value={newReturnData.total}
                onChange={handleChange}
                className="bg-gray-700 text-white rounded px-3 py-2 pl-7 w-full"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              name="description"
              value={newReturnData.description}
              onChange={handleChange}
              className="bg-gray-700 text-white rounded px-3 py-2 w-full h-24"
              placeholder="Enter a description for this return"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lender (Who paid initially)*</label>
            <select
              name="lenderUserId"
              value={newReturnData.lenderUserId}
              onChange={handleChange}
              className="bg-gray-700 text-white rounded px-3 py-2 w-full"
              required
            >
              <option value="">Select a Lender</option>
              {userOptions.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payee (Who needs to pay back)*</label>
            <select
              name="payeeUserId"
              value={newReturnData.payeeUserId}
              onChange={handleChange}
              className="bg-gray-700 text-white rounded px-3 py-2 w-full"
              required
            >
              <option value="">Select a Payee</option>
              {userOptions.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            {newReturnData.lenderUserId && newReturnData.payeeUserId && 
             newReturnData.lenderUserId === newReturnData.payeeUserId && (
              <p className="text-red-400 text-sm mt-1">Warning: Lender and Payee are the same person</p>
            )}
          </div>
          
          <div className="text-gray-400 text-sm">
            <p>Selected Transactions: {newReturnData.returnedTransactionIds.length}</p>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Creating...' : 'Create Return Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}