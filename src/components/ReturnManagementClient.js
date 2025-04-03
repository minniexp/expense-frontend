'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchReturns, updateReturn, deleteReturn } from '@/services/api';

export default function ReturnManagementClient({ initialReturns }) {
  const router = useRouter();
  const [returns, setReturns] = useState(initialReturns || []);
  const [loading, setLoading] = useState(false); // Set to false initially since we have initialReturns
  const [selectedReturns, setSelectedReturns] = useState(new Set());
  const [sortOrder, setSortOrder] = useState('asc'); // Default sort order (oldest first)

  // Fetch all return documents using similar approach to fetchMongoDBTransactions
  const fetchReturnDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchReturns();
      
      // Sort returns by date
      const sortedReturns = sortReturnsByDate(data, sortOrder);
      setReturns(sortedReturns);
    } catch (error) {
      console.error('Error fetching returns:', error);
      alert(`Failed to load return documents: ${error.message}`);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to sort returns by date
  const sortReturnsByDate = (returnsData, order) => {
    return [...returnsData].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    setReturns(sortReturnsByDate(returns, newOrder));
  };

  // Temporary direct fetch method (to be removed once API service is working)
  const directFetchReturns = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/returns`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch returns: ${response.status}`);
      }

      const data = await response.json();
      
      // Sort returns by date
      const sortedReturns = sortReturnsByDate(data, sortOrder);
      setReturns(sortedReturns);
    } catch (error) {
      console.error('Direct fetch error:', error);
      alert(`Error loading returns: ${error.message}`);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete a return document using the API service
  const handleDeleteReturn = async (id) => {
    if (!confirm('Are you sure you want to delete this return?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteReturn(id);
      
      // Refresh the list after deletion
      await fetchReturnDocuments();
      alert('Return deleted successfully');
    } catch (error) {
      console.error('Error deleting return document:', error);
      alert(`Error deleting return: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle confirmation status using the API service
  const handleToggleConfirmation = async (returnDoc, field) => {
    try {
      setLoading(true);
      const updatedReturnData = { ...returnDoc, [field]: !returnDoc[field] };
      
      await updateReturn(returnDoc._id, updatedReturnData);
      
      // Refresh the list after update
      await fetchReturnDocuments();
    } catch (error) {
      console.error('Error updating return document:', error);
      alert(`Error updating return: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (returnId) => {
    setSelectedReturns(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(returnId)) {
        newSelected.delete(returnId);
      } else {
        newSelected.add(returnId);
      }
      return newSelected;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedReturns.size === returns.length) {
      // If all are selected, clear selection
      setSelectedReturns(new Set());
    } else {
      // Select all returns
      setSelectedReturns(new Set(returns.map(r => r._id)));
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

  // Apply initial sorting to the provided returns
  useEffect(() => {
    if (initialReturns && initialReturns.length > 0) {
      setReturns(sortReturnsByDate(initialReturns, sortOrder));
    }
  }, [initialReturns]);

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
          onClick={fetchReturnDocuments}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Returns
        </button>

        <button
          onClick={() => router.push('/return/add')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Return
        </button>

        <button
          onClick={directFetchReturns}
          className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Direct Fetch
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Returns Management</h1>
      
      {loading ? (
        <div className="text-center text-gray-600">Loading returns...</div>
      ) : returns.length > 0 ? (
        <div className="overflow-x-auto">
          {/* Sort order toggle button */}
          <div className="mb-2 flex justify-end">
            <button
              onClick={toggleSortOrder}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
            >
              Sort by Date: {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              <svg 
                className="ml-1 w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {sortOrder === 'asc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            </button>
          </div>

          <table className="min-w-full bg-black text-white border border-gray-600">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 border border-gray-600">
                  <input
                    type="checkbox"
                    checked={returns.length > 0 && selectedReturns.size === returns.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  />
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center justify-center">
                    Date
                    <button 
                      onClick={toggleSortOrder} 
                      className="ml-1 text-gray-400 hover:text-white focus:outline-none"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortOrder === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Total Amount</th>
                <th className="px-4 py-2">Lender User ID</th>
                <th className="px-4 py-2">Payee User ID</th>
                <th className="px-4 py-2">Transactions</th>
                <th className="px-4 py-2">Payee Confirmation</th>
                <th className="px-4 py-2">Lender Confirmation</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((returnDoc) => (
                <tr key={returnDoc._id} className="border-t border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedReturns.has(returnDoc._id)}
                      onChange={() => handleCheckboxChange(returnDoc._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-2">{formatDate(returnDoc.date)}</td>
                  <td className="px-4 py-2">{returnDoc.description || '-'}</td>
                  <td className="px-4 py-2 text-red-400">${returnDoc.total.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {returnDoc.lenderUser ? (
                      <div>
                        <div className="font-medium">{returnDoc.lenderUser.name}</div>
                        <div className="text-xs text-gray-400">{returnDoc.lenderUserId}</div>
                      </div>
                    ) : (
                      returnDoc.lenderUserId || '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {returnDoc.payeeUser ? (
                      <div>
                        <div className="font-medium">{returnDoc.payeeUser.name}</div>
                        <div className="text-xs text-gray-400">{returnDoc.payeeUserId}</div>
                      </div>
                    ) : (
                      returnDoc.payeeUserId || '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="bg-blue-500 text-white px-2 py-0.5 rounded">
                      {returnDoc.returnedTransactionIds?.length || 0} transactions
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleToggleConfirmation(returnDoc, 'paidBackConfirmationPayee')}
                      className={`px-3 py-1 rounded ${
                        returnDoc.paidBackConfirmationPayee
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {returnDoc.paidBackConfirmationPayee ? 'Confirmed' : 'Pending'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleToggleConfirmation(returnDoc, 'paidBackConfirmationLender')}
                      className={`px-3 py-1 rounded ${
                        returnDoc.paidBackConfirmationLender
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {returnDoc.paidBackConfirmationLender ? 'Confirmed' : 'Pending'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/return/edit/${returnDoc._id}`)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReturn(returnDoc._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-800 rounded-lg">
          <p className="text-gray-400 mb-4">No return documents found</p>
          <button
            onClick={() => router.push('/return/add')}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Create your first return
          </button>
        </div>
      )}
    </div>
  );
} 