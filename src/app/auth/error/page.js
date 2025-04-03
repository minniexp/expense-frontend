'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'An error occurred during authentication.';
  
  switch (error) {
    case 'not_approved':
      errorMessage = 'Your account has not been approved for access.';
      break;
    case 'validation_failed':
      errorMessage = 'We could not validate your account. Please contact an administrator.';
      break;
    case 'server_error':
      errorMessage = 'There was a server error during authentication. Please try again later.';
      break;
    default:
      if (error) {
        errorMessage = `Authentication error: ${error}`;
      }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        
        <h1 className="text-2xl font-bold mb-4 text-white">Authentication Error</h1>
        
        <p className="text-gray-300 mb-6">
          {errorMessage}
        </p>
        
        <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
} 