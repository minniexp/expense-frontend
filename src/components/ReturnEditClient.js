'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fetchReturn, updateReturn, deleteReturn } from '@/services/api';

export default function ReturnEditClient({ returnId, initialReturnData, initialTransactions }) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnDoc, setReturnDoc] = useState(initialReturnData || null);
  const [selectedDate, setSelectedDate] = useState(initialReturnData && initialReturnData.date ? new Date(initialReturnData.date) : new Date());
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [formData, setFormData] = useState({
    total: initialReturnData ? initialReturnData.total.toString() : '',
    description: initialReturnData ? initialReturnData.description || '' : '',
    lenderUserId: initialReturnData ? initialReturnData.lenderUserId || '' : '',
    payeeUserId: initialReturnData ? initialReturnData.payeeUserId || '' : '',
    returnedTransactionIds: initialReturnData ? initialReturnData.returnedTransactionIds || [] : [],
    paidBackConfirmationPayee: initialReturnData ? initialReturnData.paidBackConfirmationPayee || false : false,
    paidBackConfirmationLender: initialReturnData ? initialReturnData.paidBackConfirmationLender || false : false
  });

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

  // Fetch related transactions if there are any transaction IDs
  const fetchRelatedTransactions = async (transactionIds) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Get token from cookie client-side if available
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
        
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${backendUrl}/api/transactions/by-ids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: transactionIds }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch related transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching related transactions:', error);
      // Continue execution even if fetching transactions fails
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleConfirmation = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.total === '' || !formData.lenderUserId || !formData.payeeUserId) {
      alert('Please fill in required fields: Amount, Lender, and Payee');
      return;
    }

    // Format date to YYYY-MM-DD
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
      setSaving(true);
      const updatedReturn = {
        ...formData,
        total: parseFloat(formData.total),
        date: dateString,
      };

      await updateReturn(returnId, updatedReturn);
      alert('Return document updated successfully!');
      router.push('/return');
    } catch (error) {
      console.error('Error updating return document:', error);
      alert(`Failed to update return document: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReturn = async () => {
    if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteReturn(returnId);
      alert('Return document deleted successfully!');
      router.push('/return');
    } catch (error) {
      console.error('Error deleting return document:', error);
      alert(`Failed to delete return document: ${error.message}`);
      setLoading(false);
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

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Add this new function to handle transaction removal
  const handleRemoveTransaction = async (transaction, index) => {
    if (!confirm(`Are you sure you want to remove this transaction from the return document?
${transaction.description}: ${formatCurrency(Math.abs(transaction.amount))}`)) {
      return;
    }

    try {
      // Calculate the new total by subtracting the transaction amount
      const transactionAmount = Math.abs(transaction.amount);
      const newTotal = parseFloat(formData.total) - transactionAmount;
      
      // Remove the transaction ID from both arrays
      const newTransactionIds = formData.returnedTransactionIds.filter(id => 
        id !== transaction._id.toString()
      );
      
      // Also handle tellerTransactionId removal if it exists in the returnDoc
      let newTellerTransactionIds = [];
      if (returnDoc.returnedTellerTransactionIds) {
        newTellerTransactionIds = returnDoc.returnedTellerTransactionIds.filter(id => 
          id !== transaction.tellerTransactionId
        );
      }
      
      // Create updated return data
      const updatedReturnData = {
        ...formData,
        total: newTotal.toString(),
        returnedTransactionIds: newTransactionIds,
        returnedTellerTransactionIds: newTellerTransactionIds
      };
      
      // Save changes to the return document
      setSaving(true);
      await updateReturn(returnId, updatedReturnData);
      
      // Now update the transaction document to remove its returnId
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Get token from cookie client-side if available
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
        
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Clear the returnId and returned flag from the transaction
      const updatedTransaction = {
        ...transaction,
        returnId: null,  // Set to null to clear the returnId
        returned: false  // Also update the returned flag
      };
      
      // Update the transaction in the database
      const transactionResponse = await fetch(`${backendUrl}/api/transactions/update-many`, {
        method: 'PUT',
        headers,
        body: JSON.stringify([updatedTransaction]),
        credentials: 'include'
      });
      
      if (!transactionResponse.ok) {
        throw new Error('Failed to update transaction');
      }
      
      // Update local state
      setFormData(updatedReturnData);
      setTransactions(prev => prev.filter((_, i) => i !== index));
      
      alert('Transaction removed from return document successfully!');
    } catch (error) {
      console.error('Error removing transaction:', error);
      alert(`Failed to remove transaction: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading return document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => router.push('/return')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Returns
        </button>
        
        <button
          onClick={handleDeleteReturn}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Delete Return
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Return Document</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date*</label>
              <DatePicker
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
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
                  value={formData.total}
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
                value={formData.description}
                onChange={handleChange}
                className="bg-gray-700 text-white rounded px-3 py-2 w-full h-24"
                placeholder="Enter a description for this return"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lender (Who paid initially)*</label>
              <select
                name="lenderUserId"
                value={formData.lenderUserId}
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
                value={formData.payeeUserId}
                onChange={handleChange}
                className="bg-gray-700 text-white rounded px-3 py-2 w-full"
                required
              >
                <option value="">Select a Payee</option>
                {userOptions.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              {formData.lenderUserId && formData.payeeUserId && formData.lenderUserId === formData.payeeUserId && (
                <p className="text-red-400 text-sm mt-1">Warning: Lender and Payee are the same person</p>
              )}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirmation Status</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => handleToggleConfirmation('paidBackConfirmationPayee')}
                    className={`px-4 py-2 rounded-lg w-full ${
                      formData.paidBackConfirmationPayee
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {formData.paidBackConfirmationPayee ? 'Payee Confirmed' : 'Payee Pending'}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleToggleConfirmation('paidBackConfirmationLender')}
                    className={`px-4 py-2 rounded-lg w-full ${
                      formData.paidBackConfirmationLender
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {formData.paidBackConfirmationLender ? 'Lender Confirmed' : 'Lender Pending'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 px-4 rounded font-bold ${
                  saving 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="font-bold text-lg mb-4 pb-2 border-b border-gray-700">Return Summary</h2>
          
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">ID:</span>
              <div className="font-mono text-xs bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
                {returnId}
              </div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm">Created:</span>
              <div className="mt-1">
                {returnDoc.createdAt ? formatDate(returnDoc.createdAt) : 'N/A'}
              </div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm">Last Updated:</span>
              <div className="mt-1">
                {returnDoc.updatedAt ? formatDate(returnDoc.updatedAt) : 'N/A'}
              </div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm">Linked Transactions:</span>
              <div className="mt-1 text-2xl font-bold">
                {formData.returnedTransactionIds.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modified Associated Transactions section */}
      <div className="bg-gray-800 p-6 rounded-lg mt-6">
        <h2 className="font-bold text-lg mb-4">Associated Transactions</h2>
        
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-900 text-white border border-gray-700 rounded-lg">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 w-12">#</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Payment Method</th>
                  <th className="px-4 py-2 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={transaction._id} className="border-t border-gray-700 hover:bg-gray-700">
                    <td className="px-4 py-2 text-center text-gray-400 font-mono">{index + 1}</td>
                    <td className="px-4 py-2">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-2">{transaction.description}</td>
                    <td className="px-4 py-2 text-red-400">{formatCurrency(Math.abs(transaction.amount))}</td>
                    <td className="px-4 py-2">{transaction.category}</td>
                    <td className="px-4 py-2">{transaction.paymentMethod}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleRemoveTransaction(transaction, index)}
                        disabled={saving}
                        className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm ${
                          saving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-800">
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-right font-semibold">Total:</td>
                  <td className="px-4 py-2 text-red-400 font-bold">
                    {formatCurrency(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-700 rounded">
            <p className="text-gray-400">No transactions associated with this return document.</p>
            <p className="text-sm mt-2 text-gray-500">
              Transactions can be linked to this return from the transactions page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 