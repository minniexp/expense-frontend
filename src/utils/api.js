import Cookies from 'js-cookie';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

// Utility function for authenticated API calls
export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = Cookies.get('auth_token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  const response = await fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    Cookies.remove('auth_token');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }
  
  if (response.status === 403) {
    // User doesn't have permission
    window.location.href = '/auth/error?error=unauthorized';
    throw new Error('You do not have permission to access this resource');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'An error occurred');
  }
  
  return response.json();
}; 