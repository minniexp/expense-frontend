'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Cookies from 'js-cookie';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Effect to sync with NextAuth session
  useEffect(() => {
    const syncWithSession = async () => {
      
      if (status === 'authenticated' && session) {
        
        // Try different paths to find the token
        const token = session.accessToken || session.user?.token;
        
        if (token) {          
          // Set the cookie with explicit domain and path
          Cookies.set('auth_token', token, { 
            expires: 180,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
          });
          
          try {
            await verifyToken(token);
            console.log("Token verified successfully");
          } catch (error) {
            console.error("Failed to verify token:", error);
          }
        } else {
        }
      } else if (status === 'unauthenticated') {
        // If explicitly unauthenticated, clear state
        console.log("Session unauthenticated, clearing state");
        setUser(null);
        setLoading(false);
        Cookies.remove('auth_token');
      } else if (status !== 'loading') {
        // Try to verify existing token if present
        const existingToken = Cookies.get('auth_token');
        if (existingToken) {
          console.log("Found existing auth_token, verifying");
          try {
            await verifyToken(existingToken);
            console.log("Existing token verified successfully");
          } catch (error) {
            console.error("Failed to verify existing token:", error);
            // Clear invalid token
            Cookies.remove('auth_token');
            setUser(null);
          }
        } else {
          console.log("No auth token found");
          setLoading(false);
        }
      }
    };

    syncWithSession();
  }, [status, session]);

  const login = async (token) => {
    if (token) {
      // Store token in cookie with 6-month expiration
      Cookies.set('auth_token', token, { expires: 180 });
      await verifyToken(token);
    }
  };

  const logout = async () => {
    console.log("Logging out");
    
    // Remove auth_token cookie
    Cookies.remove('auth_token');
    
    // Clear user state
    setUser(null);
    
    // Sign out from NextAuth session
    try {
      // Call the NextAuth signOut endpoint
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error("Error signing out of NextAuth:", error);
    }
    
    // Navigate to home page
    router.push('/');
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 401) {
          // Token expired or invalid
          Cookies.remove('auth_token');
          router.push('/');
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 404) {
          router.push('/');
          throw new Error('User not found');
        } else if (response.status === 403) {
          router.push('/auth/error?error=not_approved');
          throw new Error('Your account is not approved');
        } else {
          throw new Error(error.error || 'An error occurred');
        }
      }

      const data = await response.json();
      setUser(data.user);
      // After successful verification, redirect to summary
      if (window.location.pathname === '/') {
        router.push('/summary');
      }
      return data;
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 