'use client';

import { useState } from 'react';
import TellerLink from '@/components/TellerLink';

export default function TellerTest() {
  const [linkStatus, setLinkStatus] = useState('');
  const [transactions, setTransactions] = useState([]);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const isProduction = process.env.NEXT_PUBLIC_DEPLOYED_STAGE === 'production';

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/teller/transactions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setTransactions(data);
      } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Teller Connection Test</h1>
      
      {isProduction && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          ⚠️ Actions disabled in production environment
        </div>
      )}
      
      <div className="mb-4">
        <TellerLink 
          onSuccess={() => setLinkStatus('Connected!')} 
          disabled={isProduction}
        />
      </div>
      
      <div className="mb-4">
        Status: {linkStatus} {linkStatus === 'Connected!' ? '🟢' : '🔴'}
      </div>

      <button 
        onClick={fetchTransactions}
        disabled={isProduction}
        className={`
          font-bold py-2 px-4 rounded transition-colors duration-200
          ${isProduction 
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
            : 'bg-blue-500 hover:bg-blue-700 text-white'
          }
        `}
        title={isProduction ? 'Actions disabled in production' : ''}
      >
        {isProduction ? 'Fetch Disabled in Production' : 'Fetch Transactions'}
      </button>

      <div className="mt-4">
        <h2 className="text-xl mb-2">Transactions:</h2>
        <pre className={`p-4 rounded ${
          isProduction 
            ? 'bg-gray-200 text-gray-500'
            : 'bg-gray-100 text-black'
        }`}>
          {JSON.stringify(transactions, null, 2)}
        </pre>
      </div>
    </div>
  );
}