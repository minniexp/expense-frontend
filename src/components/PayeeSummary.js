'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { monthToReturnIdMap, MONTH_TO_RETURN_ID_MAP_2026 } from '@/utils/constants';
import { fetchAvailableReturns, fetchMongoDBTransactions, fetchTransactionsByIds, setReturnConfirmation } from '@/services/api';
import Cookies from 'js-cookie';

export default function PayeeSummary() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 
    7: [], 8: [], 9: [], 10: [], 11: [], 12: []
  });
  const [monthlySummary, setMonthlySummary] = useState({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  });
  const [monthlyReturns, setMonthlyReturns] = useState({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
    7: null, 8: null, 9: null, 10: null, 11: null, 12: null
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [koreaData, setKoreaData] = useState(null);
  const [koreaTransactions, setKoreaTransactions] = useState([]);
  const [selectedSection, setSelectedSection] = useState('month'); // 'month' or 'korea'
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // Korea (Mom) return document ID
  const KOREA_RETURN_ID = '68ba19ebaf425ee291319a31';

  // Which button is mid-save, so only that one shows a pending state.
  const [confirming, setConfirming] = useState(null);

  /**
   * Record that the payback has been sent (or undo it).
   *
   * Only the two confirmation booleans are sent — never the whole return document. Round-
   * tripping the document to flip one flag lets a stale client copy overwrite `total` or
   * `returnedTransactionIds`, and those are money and transaction links.
   *
   * Local state is updated from the server's response rather than optimistically, so what is
   * on screen is what was actually stored.
   */
  const handleConfirmation = async (returnDoc, role, nextValue, scope) => {
    if (!returnDoc?._id) return;
    const label = role === 'payee' ? 'payee' : 'lender';
    if (!nextValue && !window.confirm(`Undo the ${label} confirmation for this payback?`)) return;

    try {
      setConfirming(returnDoc._id + role);
      const updated = await setReturnConfirmation(returnDoc._id, { [role]: nextValue });
      if (scope === 'korea') {
        setKoreaData((prev) => (prev ? { ...prev, ...updated } : updated));
      } else {
        setMonthlyReturns((prev) => ({
          ...prev,
          [selectedMonth]: { ...prev[selectedMonth], ...updated },
        }));
      }
    } catch (err) {
      console.error('Error updating confirmation:', err);
      alert(`Could not update: ${err.message}`);
    } finally {
      setConfirming(null);
    }
  };

  /** Status badges plus the actions that change them. Shared by the monthly and Korea views. */
  const renderStatus = (returnDoc, scope) => {
    if (!returnDoc) return null;
    const payeeDone = Boolean(returnDoc.paidBackConfirmationPayee);
    const lenderDone = Boolean(returnDoc.paidBackConfirmationLender);
    const busyPayee = confirming === returnDoc._id + 'payee';
    const btn = 'px-4 py-3 rounded font-bold text-sm flex-1 min-w-[150px] disabled:opacity-50 ' +
      'disabled:cursor-not-allowed';

    return (
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-gray-400 text-sm mb-1">Status</h3>
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className={`px-2 py-1 rounded text-sm ${
            payeeDone ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
            {payeeDone ? 'Payee Confirmed' : 'Payee Pending'}
          </span>
          <span className={`px-2 py-1 rounded text-sm ${
            lenderDone ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
            {lenderDone ? 'Lender Confirmed' : 'Lender Pending'}
          </span>
        </div>

        <div className="mt-3">
          {/* Payee only. The lender flag is shown as a badge above but is not editable here —
              this page is the payee's view, and the lender confirming receipt is a separate
              act by a different person. It remains editable on the Returns page. */}
          <button
            onClick={() => handleConfirmation(returnDoc, 'payee', !payeeDone, scope)}
            disabled={busyPayee}
            className={`${btn} w-full sm:w-auto ${payeeDone
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {busyPayee ? 'Saving…' : payeeDone ? 'Undo sent payment' : 'Sent Payment'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press “Sent Payment” once the payee has actually paid this back. It records the
          payee confirmation and saves immediately — the badge above turns green only after
          that.
        </p>
      </div>
    );
  };

  const monthNames = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
  };

  const formatAmount = (amount) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(2)}`;
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // First fetch return documents with their transactions
      await fetchAllReturnDocuments();
      
      // Fetch Korea (Mom) return document
      await fetchKoreaReturnDocument();
      
      // Then fetch all transactions for reference only
      await fetchTransactions();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReturnDocuments = async () => {
    try {
      // Initialize objects to store our data
      const monthReturnsData = {};
      const monthlyTransactionsData = { ...monthlyTransactions };
      const monthlySummaryData = { ...monthlySummary };

      // Fetch all return documents
      const response = await fetchAvailableReturns()

      const allReturns = response

      // Select the appropriate map based on selected year
      const currentYearMap = selectedYear === 2026 ? MONTH_TO_RETURN_ID_MAP_2026 : monthToReturnIdMap;

      // Map return documents to their respective months
      for (let month = 1; month <= 12; month++) {

        const returnId = currentYearMap[month]

        
        if (returnId) {
        //   console.log(`Looking for return ID ${returnId} for month ${month}`);
          const monthlyReturn = allReturns.find(r => r._id === returnId);
          
          if (monthlyReturn) {
            
            // Store the return document
            monthReturnsData[month] = monthlyReturn;
            
            // Set the monthly summary from the return document's total
            monthlySummaryData[month] = monthlyReturn.total;
            
            // Fetch transactions for this return
            if (monthlyReturn.returnedTransactionIds && monthlyReturn.returnedTransactionIds.length > 0) {
              console.log(`Month ${month} has ${monthlyReturn.returnedTransactionIds.length} transactions`);
              
              try {
                const transactions = await fetchTransactionsByIds(monthlyReturn.returnedTransactionIds)
                                
                // Store the transactions for this month
                monthlyTransactionsData[month] = transactions;
              } catch (error) {
                console.error(`Error fetching transactions for month ${month}:`, error);
                monthlyTransactionsData[month] = []; // Empty array if fetch fails
              }
            } else {
              console.log(`Month ${month} has no transactions`);
              monthlyTransactionsData[month] = []; // Empty array if no transactions
            }
          } else {
            console.log(`Return ID not found for month ${month}`);
          }
        }
      }
      
      // Update all our state at once
      setMonthlyReturns(monthReturnsData);
      setMonthlySummary(monthlySummaryData);
      setMonthlyTransactions(monthlyTransactionsData);
      
    } catch (error) {
      console.error('Error fetching return documents:', error);
    }
  };

  const fetchKoreaReturnDocument = async () => {
    try {
      // Fetch all return documents
      const response = await fetchAvailableReturns();
      const allReturns = response;
      
      // Find the Korea return document
      const koreaReturn = allReturns.find(r => r._id === KOREA_RETURN_ID);
      
      if (koreaReturn) {
        console.log('Found Korea return document:', koreaReturn);
        setKoreaData(koreaReturn);
        
        // Fetch transactions for Korea return
        if (koreaReturn.returnedTransactionIds && koreaReturn.returnedTransactionIds.length > 0) {
          console.log(`Korea has ${koreaReturn.returnedTransactionIds.length} transactions`);
          
          try {
            const transactions = await fetchTransactionsByIds(koreaReturn.returnedTransactionIds);
            setKoreaTransactions(transactions);
          } catch (error) {
            console.error('Error fetching Korea transactions:', error);
            setKoreaTransactions([]);
          }
        } else {
          console.log('Korea has no transactions');
          setKoreaTransactions([]);
        }
      } else {
        console.log('Korea return document not found');
      }
    } catch (error) {
      console.error('Error fetching Korea return document:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetchMongoDBTransactions()
      const data = response

      console.log(`Fetched ${data.length} total transactions for reference`);
      
      // Just store all transactions for reference, no other processing
      setTransactions(data);
      
    } catch (error) {
      console.error('Error fetching all transactions:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }).format(date);
  };

  const handleSignOut = () => {
    try {
      // Remove cookies with specific options
      const options = {
        path: '/',
        domain: window.location.hostname
      };

      Cookies.remove('next-auth.session-token', options);
      Cookies.remove('next-auth.csrf-token', options);
      Cookies.remove('next-auth.callback-url', options);
      
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Parents Monthly Expense Summary</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Sign Out
        </button>
      </div>

      {/* Year Tabs */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedYear(2025)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedYear === 2025
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            2025
          </button>
          <button
            onClick={() => setSelectedYear(2026)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedYear === 2026
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            2026
          </button>
        </div>
      </div>

      {/* Section 1: Summary */}
      <div className="mb-12 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Monthly Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(monthlySummary).map(([month, total]) => (
            <div 
              key={month} 
              className={`bg-gray-700 p-4 rounded-lg text-white cursor-pointer hover:bg-gray-600 ${
                selectedSection === 'month' && selectedMonth === Number(month) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => {
                setSelectedSection('month');
                setSelectedMonth(Number(month));
              }}
            >
              {/* Mobile-friendly month display */}
              <h3 className="font-bold text-sm md:text-base truncate">
                {monthNames[month]}
              </h3>
              
              {/* Mobile-friendly amount display */}
              <p className="text-xl md:text-2xl font-bold truncate">
                {/* Show abbreviated amount on mobile, full amount on larger screens */}
                <span className="md:hidden">{formatAmount(Number(total))}</span>
                <span className="hidden md:inline">${Number(total).toFixed(2)}</span>
              </p>

              {/* Only show these details on tablet and desktop */}
              <div className="hidden md:block">
                {monthlyReturns[month] && (
                  <div className="mt-2 text-sm bg-blue-600 rounded px-2 py-1 inline-block">
                    Return Doc Available
                  </div>
                )}
                {monthlyReturns[month] && (
                  <div className="mt-1 text-xs text-gray-300">
                    {monthlyTransactions[month].length} transactions
                  </div>
                )}
              </div>

              {/* Mobile-only transaction count */}
              <div className="md:hidden">
                {monthlyReturns[month] && (
                  <div className="mt-1 text-xs text-gray-300">
                    {monthlyTransactions[month].length}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Korea (Mom) Section */}
          {koreaData && (
            <div 
              className={`bg-purple-700 p-4 rounded-lg text-white cursor-pointer hover:bg-purple-600 ${
                selectedSection === 'korea' ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedSection('korea')}
            >
              <h3 className="font-bold text-sm md:text-base truncate">
                Korea (Mom)
              </h3>
              
              <p className="text-xl md:text-2xl font-bold truncate">
                <span className="md:hidden">{formatAmount(Number(koreaData.total))}</span>
                <span className="hidden md:inline">${Number(koreaData.total).toFixed(2)}</span>
              </p>

              <div className="hidden md:block">
                <div className="mt-2 text-sm bg-purple-600 rounded px-2 py-1 inline-block">
                  Special Return
                </div>
                <div className="mt-1 text-xs text-gray-300">
                  {koreaTransactions.length} transactions
                </div>
              </div>

              <div className="md:hidden">
                <div className="mt-1 text-xs text-gray-300">
                  {koreaTransactions.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Return Document Info */}
      {selectedSection === 'month' && monthlyReturns[selectedMonth] && (
        <div className="mb-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
            <span>{monthNames[selectedMonth]} Return Document</span>
            <button
              onClick={() => router.push(`/return/edit/${monthlyReturns[selectedMonth]._id}`)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-1 rounded"
            >
              Edit Return
            </button>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Date</h3>
              <p className="text-white">{formatDate(monthlyReturns[selectedMonth].date)}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Total Amount</h3>
              <p className="text-red-400 text-xl font-bold">
                ${monthlyReturns[selectedMonth].total.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Description</h3>
              <p className="text-white">{monthlyReturns[selectedMonth].description || 'No description'}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Lender</h3>
              <p className="text-white">
                {monthlyReturns[selectedMonth].lenderUser?.name || monthlyReturns[selectedMonth].lenderUserId || '-'}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Payee</h3>
              <p className="text-white">
                {monthlyReturns[selectedMonth].payeeUser?.name || monthlyReturns[selectedMonth].payeeUserId || '-'}
              </p>
            </div>
            
            {renderStatus(monthlyReturns[selectedMonth], 'month')}
          </div>
          
          {/* Transaction Count Summary */}
          <div className="mt-4 bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{monthlyReturns[selectedMonth].returnedTransactionIds?.length || 0}</span> transactions linked to this return document
              </div>
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{monthlyTransactions[selectedMonth].length}</span> transactions shown below
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Korea Return Document Info */}
      {selectedSection === 'korea' && koreaData && (
        <div className="mb-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
            <span>Korea (Mom) Return Document</span>
            <button
              onClick={() => router.push(`/return/edit/${koreaData._id}`)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-1 rounded"
            >
              Edit Return
            </button>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Date</h3>
              <p className="text-white">{formatDate(koreaData.date)}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Total Amount</h3>
              <p className="text-red-400 text-xl font-bold">
                ${koreaData.total.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Description</h3>
              <p className="text-white">{koreaData.description || 'No description'}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Lender</h3>
              <p className="text-white">
                {koreaData.lenderUser?.name || koreaData.lenderUserId || '-'}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Payee</h3>
              <p className="text-white">
                {koreaData.payeeUser?.name || koreaData.payeeUserId || '-'}
              </p>
            </div>
            
            {renderStatus(koreaData, 'korea')}
          </div>
          
          {/* Transaction Count Summary */}
          <div className="mt-4 bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{koreaData.returnedTransactionIds?.length || 0}</span> transactions linked to this return document
              </div>
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{koreaTransactions.length}</span> transactions shown below
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Transaction Table */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
          <span className="truncate">
            {selectedSection === 'korea' ? 'Korea (Mom)' : monthNames[selectedMonth]}
          </span>
          <span className="text-sm bg-blue-600 rounded px-2 py-1 ml-2">
            {selectedSection === 'korea' ? koreaTransactions.length : monthlyTransactions[selectedMonth].length}
          </span>
        </h2>

        {/* Responsive table */}
        {((selectedSection === 'month' && monthlyTransactions[selectedMonth] && monthlyTransactions[selectedMonth].length > 0) ||
          (selectedSection === 'korea' && koreaTransactions && koreaTransactions.length > 0)) ? (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full bg-black text-white">
              <thead className="bg-gray-900">
                <tr>
                  {/* Hide less important columns on mobile */}
                  <th className="px-4 py-2 border border-gray-700">Date</th>
                  <th className="px-4 py-2 border border-gray-700">Amount</th>
                  <th className="px-4 py-2 border border-gray-700">Description</th>
                  <th className="hidden md:table-cell px-4 py-2 border border-gray-700">Payment Method</th>
                  <th className="hidden md:table-cell px-4 py-2 border border-gray-700">Category</th>
                  <th className="hidden md:table-cell px-4 py-2 border border-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSection === 'korea' ? koreaTransactions : monthlyTransactions[selectedMonth]).map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-700">
                    <td className="px-4 py-2 border border-gray-700 whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 py-2 border border-gray-700 text-red-400 whitespace-nowrap">
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border border-gray-700 max-w-[200px] truncate">
                      {transaction.description}
                    </td>
                    {/* Hide these columns on mobile */}
                    <td className="hidden md:table-cell px-4 py-2 border border-gray-700">{transaction.paymentMethod}</td>
                    <td className="hidden md:table-cell px-4 py-2 border border-gray-700">{transaction.category}</td>
                    <td className="hidden md:table-cell px-4 py-2 border border-gray-700">{transaction.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900">
                  <td className="px-4 py-2 border border-gray-700 font-bold">Total</td>
                  <td className="px-4 py-2 border border-gray-700 text-red-400 font-bold">
                    ${selectedSection === 'korea' 
                      ? Number(koreaData?.total || 0).toFixed(2) 
                      : Number(monthlySummary[selectedMonth]).toFixed(2)}
                  </td>
                  <td colSpan="4" className="hidden md:table-cell px-4 py-2 border border-gray-700"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-700 rounded">
            <p className="text-gray-400">
              No transactions found for {selectedSection === 'korea' ? 'Korea (Mom)' : monthNames[selectedMonth]}.
            </p>
            {selectedSection === 'month' && monthlyReturns[selectedMonth] && monthlyReturns[selectedMonth].returnedTransactionIds?.length > 0 && (
              <p className="text-yellow-400 mt-2">
                Note: This return document has {monthlyReturns[selectedMonth].returnedTransactionIds.length} linked transactions, but they could not be fetched.
              </p>
            )}
            {selectedSection === 'korea' && koreaData && koreaData.returnedTransactionIds?.length > 0 && (
              <p className="text-yellow-400 mt-2">
                Note: This return document has {koreaData.returnedTransactionIds.length} linked transactions, but they could not be fetched.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}