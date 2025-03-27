'use client';

import Link from 'next/link';

export default function MyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Navigation</h1>
      
      <div className="grid gap-4">
        <Link 
          href="/add" 
          className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-between"
        >
          <span>Add Transactions</span>
          <span className="text-xl">→</span>
        </Link>

        <Link 
          href="/my" 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-between"
        >
          <span>Main Dashboard</span>
          <span className="text-xl">→</span>
        </Link>

        <Link 
          href="/test" 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-between"
        >
          <span>Test Page</span>
          <span className="text-xl">→</span>
        </Link>

        <Link 
          href="/teller" 
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-between"
        >
          <span>Teller Transactions</span>
          <span className="text-xl">→</span>
        </Link>
        <Link 
          href="/return" 
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-between"
        >
          <span>Returns</span>
          <span className="text-xl">→</span>
        </Link>
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        Select a page to navigate to different sections of the application
      </div>
    </div>
  );
}
