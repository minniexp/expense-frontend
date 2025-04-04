'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { monthToReturnIdMap } from '@/utils/constants';
import { fetchAvailableReturns, fetchMongoDBTransactions, fetchTransactionsByIds } from '@/services/api';
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
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

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
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // First fetch return documents with their transactions
      await fetchAllReturnDocuments();
      
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
      
      // Map return documents to their respective months
      for (let month = 1; month <= 12; month++) {
  
        const returnId = monthToReturnIdMap[month]

        
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

      Cookies.remove('auth_token', options);
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

      {/* Section 1: Summary */}
      <div className="mb-12 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Monthly Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(monthlySummary).map(([month, total]) => (
            <div 
              key={month} 
              className={`bg-gray-700 p-4 rounded-lg text-white cursor-pointer hover:bg-gray-600 ${
                selectedMonth === Number(month) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedMonth(Number(month))}
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
        </div>
      </div>

      {/* Monthly Return Document Info */}
      {monthlyReturns[selectedMonth] && (
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
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-1">Status</h3>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-1 rounded text-sm ${
                  monthlyReturns[selectedMonth].paidBackConfirmationPayee
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {monthlyReturns[selectedMonth].paidBackConfirmationPayee ? 'Payee Confirmed' : 'Payee Pending'}
                </span>
                <span className={`px-2 py-1 rounded text-sm ${
                  monthlyReturns[selectedMonth].paidBackConfirmationLender
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {monthlyReturns[selectedMonth].paidBackConfirmationLender ? 'Lender Confirmed' : 'Lender Pending'}
                </span>
              </div>
            </div>
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

      {/* Section 2: Transaction Table */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
          <span className="truncate">{monthNames[selectedMonth]}</span>
          <span className="text-sm bg-blue-600 rounded px-2 py-1 ml-2">
            {monthlyTransactions[selectedMonth].length}
          </span>
        </h2>

        {/* Responsive table */}
        {monthlyTransactions[selectedMonth] && monthlyTransactions[selectedMonth].length > 0 ? (
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
                {monthlyTransactions[selectedMonth].map((transaction) => (
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
                    ${Number(monthlySummary[selectedMonth]).toFixed(2)}
                  </td>
                  <td colSpan="4" className="hidden md:table-cell px-4 py-2 border border-gray-700"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-700 rounded">
            <p className="text-gray-400">No transactions found for {monthNames[selectedMonth]}.</p>
            {monthlyReturns[selectedMonth] && monthlyReturns[selectedMonth].returnedTransactionIds?.length > 0 && (
              <p className="text-yellow-400 mt-2">
                Note: This return document has {monthlyReturns[selectedMonth].returnedTransactionIds.length} linked transactions, but they could not be fetched.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}