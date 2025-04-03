'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // This effect handles the NextAuth session and cookie synchronization
  useEffect(() => {
    const syncSessionWithCookies = async () => {
      if (status === 'loading') return;
      
      console.log("Session state:", status);
      console.log("Session data:", session);
      
      // If we're authenticated via NextAuth but missing the auth_token cookie
      if (status === 'authenticated' && session?.accessToken && !Cookies.get('auth_token')) {
        console.log("Setting auth_token from session", session.accessToken.substring(0, 10) + "...");
        Cookies.set('auth_token', session.accessToken, { 
          path: '/',
          expires: 7, // 7 days
          sameSite: 'lax'
        });
        
        // Give time for the cookie to be set
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setSessionChecked(true);
    };
    
    syncSessionWithCookies();
  }, [status, session]);

  // This effect handles the redirects
  useEffect(() => {
    if (!sessionChecked) return;
    
    if (redirectAttempted) return;
    
    const hasAuthToken = !!Cookies.get('auth_token');
    const hasSessionToken = !!Cookies.get('next-auth.session-token');
    
    console.log("Redirect check:", {
      sessionChecked,
      hasAuthToken,
      hasSessionToken,
      status,
      redirectAttempted
    });
    
    // Only redirect if we have the auth_token cookie or a valid session
    if (!loading && ((hasAuthToken || hasSessionToken) || 
        (status === 'authenticated' && session?.accessToken) || 
        user)) {
      // Don't hardcode the path, use a more dynamic approach
      const lastAttemptedPath = localStorage.getItem('lastAttemptedPath') || '/summary';
      console.log('Authentication confirmed, redirecting to:', lastAttemptedPath);
      router.push(lastAttemptedPath);
      localStorage.removeItem('lastAttemptedPath'); // Clear after use
    }
  }, [sessionChecked, status, session, redirectAttempted, router, loading, user]);

  useEffect(() => {
    // Check for URL parameters that might indicate redirect reasons
    const url = new URL(window.location.href);
    const redirectTo = url.searchParams.get('redirect_to');
    
    if (redirectTo) {
      // Store the path for after authentication
      localStorage.setItem('lastAttemptedPath', redirectTo);
      
      // Remove parameters to prevent them from affecting future navigation
      url.searchParams.delete('redirect_to');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleSignIn = async () => {
    await signIn('google');
  };

  const logTokenDebug = () => {
    console.log('Current tokens:');
    console.log('auth_token:', Cookies.get('auth_token'));
    console.log('next-auth.session-token:', Cookies.get('next-auth.session-token'));
    console.log('Authorization header would be:', Cookies.get('auth_token') ? 
      `Bearer ${Cookies.get('auth_token')}` : 'None');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-white text-center">Expense Tracker</h1>
        <p className="text-gray-300 mb-8 text-center">
          Sign in with your Google account to access the expense tracker.
        </p>
        
        <button
          onClick={handleSignIn}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545 12.151L12.545 12.151L12.545 12.151C12.545 9.684 11.354 7.408 9.448 5.942V5.942L12.545 12.151ZM12.545 12.151L20.2 19.805L20.2 19.805C20.746 18.858 21.064 17.795 21.064 16.596C21.064 13.464 19.21 10.815 16.49 9.804L16.49 9.804L12.546 12.151L12.545 12.151ZM3.33 16.596C3.33 19.727 5.693 22.266 8.738 22.658V16.596H3.33ZM3.33 7.404C3.33 10.535 5.693 13.074 8.738 13.466V7.404H3.33Z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="mt-4">
          <button 
            onClick={logTokenDebug}
            className="text-gray-400 text-sm hover:text-white"
          >
            Debug Tokens
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignInPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sign In</h1>
      <button
        onClick={() => signIn('google')}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}