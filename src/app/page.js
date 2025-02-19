'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [transactions, setTransactions] = useState([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 
    7: [], 8: [], 9: [], 10: [], 11: [], 12: []
  });
  const [monthlySummary, setMonthlySummary] = useState({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const monthNames = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transactions:', data);
      
      // Filter for parents-monthly transactions that are expenses
      const parentMonthlyTransactions = data.filter(t => 
        t.category === 'parents-monthly' && 
        t.transactionType === 'expense'
      );
      console.log('Parent Monthly Expense Transactions:', parentMonthlyTransactions);
      setTransactions(parentMonthlyTransactions);

      // Organize by month
      const monthlyData = {
        1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 
        7: [], 8: [], 9: [], 10: [], 11: [], 12: []
      };
      
      // Calculate monthly summaries
      const summaryData = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
      };

      parentMonthlyTransactions.forEach(transaction => {
        const month = transaction.month;
        monthlyData[month].push(transaction);
        summaryData[month] += Math.abs(transaction.amount);
      });

      setMonthlyTransactions(monthlyData);
      setMonthlySummary(summaryData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Parents Monthly Expense Summary</h1>

      {/* Section 1: Summary */}
      <div className="mb-12 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Monthly Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(monthlySummary).map(([month, total]) => (
            <div key={month} className="bg-gray-700 p-4 rounded-lg text-white">
              <h3 className="font-bold">{monthNames[month]}</h3>
              <p className="text-2xl">${total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Transaction Table */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Monthly Transactions</h2>
        
        {/* Month Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(monthNames).map(([month, name]) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(Number(month))}
              className={`px-4 py-2 rounded ${
                selectedMonth === Number(month)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-black text-white">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-2 border border-gray-700">Date</th>
                <th className="px-4 py-2 border border-gray-700">Amount</th>
                <th className="px-4 py-2 border border-gray-700">Description</th>
                <th className="px-4 py-2 border border-gray-700">Payment Method</th>
                <th className="px-4 py-2 border border-gray-700">Notes</th>
                <th className="px-4 py-2 border border-gray-700">MongoDB ID</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTransactions[selectedMonth].map((transaction) => (
                <tr key={transaction.tellerTransactionId} className="hover:bg-gray-700">
                  <td className="px-4 py-2 border border-gray-700">
                    {`${transaction.month}-${transaction.day}`}
                  </td>
                  <td className="px-4 py-2 border border-gray-700">
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 border border-gray-700">{transaction.description}</td>
                  <td className="px-4 py-2 border border-gray-700">{transaction.paymentMethod}</td>
                  <td className="px-4 py-2 border border-gray-700">{transaction.notes || '-'}</td>
                  <td className="px-4 py-2 border border-gray-700 text-xs">{transaction._id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}