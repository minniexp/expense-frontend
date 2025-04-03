'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { signOut } from 'next-auth/react';

export default function UserDashboardClient({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    // Remove cookies
    Cookies.remove('auth_token');
    
    // Sign out from NextAuth - this destroys the session
    await signOut({ redirect: false });
    
    // Call custom logout API to clear all cookies on the server side
    await fetch('/api/logout', {
      method: 'POST',
    });
    
    // Redirect to home page
    router.push('/');
  };

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </header>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-bold mb-4">User Information</h2>
        <p><span className="font-medium">Email:</span> {user.email}</p>
        <p><span className="font-medium">Access Level:</span> {user.accessLevel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-left"
            >
              Home
            </button>
            {user.accessLevel === 'advanced' && (
              <>
                <button
                  onClick={() => router.push('/my')}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-left"
                >
                  Advanced Features
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 