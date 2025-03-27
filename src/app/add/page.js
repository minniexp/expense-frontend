'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { PAYMENT_METHODS, CATEGORIES, PURCHASE_CATEGORIES } from '@/utils/constants';

export default function AddTransactionPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    purchaseCategory: [],
    paymentMethod: '',
    points: 0,
    transactionType: 'expense',
    needToBePaidback: false,
    notes: '',
  });

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Use constants instead of hardcoded arrays
  const categories = CATEGORIES;
  const paymentMethods = PAYMENT_METHODS;
  const purchaseCategories = PURCHASE_CATEGORIES;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Format date components
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1; // JavaScript months are 0-based
    const day = selectedDate.getDate();
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const transactionData = {
      ...formData,
      year,
      month,
      day,
      date: dateString,
      userId: 'default-user', // Replace with actual user ID when auth is implemented
    };

    try {
      const response = await fetch(`${backendUrl}/api/transactions/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([transactionData]), // Send as array
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      alert('Transaction added successfully!');
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        category: '',
        purchaseCategory: [],
        paymentMethod: '',
        points: 0,
        transactionType: 'expense',
        needToBePaidback: false,
        notes: '',
      });
      setSelectedDate(new Date());

    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction: ' + error.message);
    }
  };

  const handlePurchaseCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      purchaseCategory: prev.purchaseCategory.includes(category)
        ? prev.purchaseCategory.filter(c => c !== category)
        : [...prev.purchaseCategory, category]
    }));
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-4">
        <button
          onClick={() => router.push('/my')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Go to Main Dashboard
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Add New Transaction</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
          <DatePicker
            selected={selectedDate}
            onChange={date => setSelectedDate(date)}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Type</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, transactionType: 'expense'})}
              className={`px-4 py-2 rounded ${
                formData.transactionType === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, transactionType: 'income'})}
              className={`px-4 py-2 rounded ${
                formData.transactionType === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat} className="flex items-center">
                <input
                  type="radio"
                  id={cat}
                  name="category"
                  value={cat}
                  checked={formData.category === cat}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="mr-2"
                />
                <label htmlFor={cat}>{cat}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
          <div className="space-y-2">
            {paymentMethods.map(method => (
              <div key={method} className="flex items-center">
                <input
                  type="radio"
                  id={method}
                  name="paymentMethod"
                  value={method}
                  checked={formData.paymentMethod === method}
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                  className="mr-2"
                />
                <label htmlFor={method}>{method}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Purchase Categories</label>
          <div className="space-y-2">
            {purchaseCategories.map(category => (
              <div key={category} className="flex items-center">
                <input
                  type="checkbox"
                  id={`purchase-${category}`}
                  checked={formData.purchaseCategory.includes(category)}
                  onChange={() => handlePurchaseCategoryChange(category)}
                  className="mr-2"
                />
                <label htmlFor={`purchase-${category}`}>{category}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Points</label>
          <input
            type="number"
            step="0.1"
            value={formData.points}
            onChange={e => setFormData({...formData, points: parseFloat(e.target.value)})}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="needToBePaidback"
            checked={formData.needToBePaidback}
            onChange={e => setFormData({...formData, needToBePaidback: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="needToBePaidback">Need to be paid back?</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full h-24"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Transaction
        </button>
      </form>
    </div>
  );
}
