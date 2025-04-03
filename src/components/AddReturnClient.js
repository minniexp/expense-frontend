'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createReturn } from '@/services/api';

export default function AddReturnClient() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    total: '',
    description: '',
    lenderUserId: '',
    payeeUserId: '',
    returnedTransactionIds: []
  });

  // Predefined user options
  const userOptions = [
    { id: '67b5395665f7131970e30e4b', name: 'Mom' },
    { id: '67b5398665f7131970e30e4e', name: 'Dad Account' },
    { id: '67b539aa65f7131970e30e51', name: 'Mom Account' },
    { id: '67e4c35710c0d9d2d0cc9b08', name: 'SHAM'},
    { id: '67e4c38410c0d9d2d0cc9b0b', name: 'YEEM'},
    { id: '67e4c39d10c0d9d2d0cc9b0e', name: 'friend'},
    { id: '67e4c3bf10c0d9d2d0cc9b11', name: 'AKM'},
    { id: '67e4c3dc10c0d9d2d0cc9b14', name: 'Kat'}
  ];

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
      setLoading(true);
      const returnData = {
        ...formData,
        total: parseFloat(formData.total),
        date: dateString,
        returnedTransactionIds: formData.returnedTransactionIds || []
      };

      await createReturn(returnData);
      alert('Return document created successfully!');
      router.push('/return');
    } catch (error) {
      console.error('Error creating return document:', error);
      alert(`Failed to create return document: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => router.push('/return')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Returns
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create New Return Document</h1>
      
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

        <div className="mt-8">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded font-bold ${
              loading 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? 'Creating...' : 'Create Return Document'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-gray-400 text-sm">
        <p>* Required fields</p>
        <p className="mt-2">Note: Once created, you can attach transactions to this return document later.</p>
      </div>
    </div>
  );
} 