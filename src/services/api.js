import axios from 'axios';
import Cookies from 'js-cookie';
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL, // Remove trailing slashes
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for CORS
});

export const fetchTransactions = async () => {
  try {
    const response = await api.get('/api/transactions');
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const fetchTellerTransactions = async () => {
  try {
    const response = await api.get('/api/teller/transactions');
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// export const fetchMonthTransactions = async (month) => {
//   const year = new Date().getFullYear();
//   const response = await api.get(`/transactions/${year}/${month}`);
//   return response.data;
// };

// Add single transaction API method
export const addSingleTransaction = async (transactionData) => {
  try {
    // Get token from cookie client-side if available
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
      
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify([transactionData]), // Send as array
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add transaction');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Add return document API methods
export const fetchReturns = async () => {
  try {
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns`, {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch returns');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createReturn = async (returnData) => {
  try {
  
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
    
    const response = await fetch(`${backendUrl}/api/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create return');
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const updateReturn = async (id, returnData) => {
  try {
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(returnData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update return');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const deleteReturn = async (id) => {
  try {
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete return');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const fetchReturn = async (id) => {
  try {
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns/${id}`, {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch return');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// For fetching Teller transactions with authentication
export const fetchTellerTransactionsWithAuth = async () => {
  try {
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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/teller/transactions`, {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Teller transactions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Server-side function to fetch returns with token
export async function fetchReturnsServer(token) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch returns: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching returns server-side:', error);
    throw error;
  }
}

// Add server-side function to fetch a return with token
export async function fetchReturnServer(id, token) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/returns/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch return: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching return server-side:', error);
    throw error;
  }
}

// Add server-side function to fetch transactions by IDs with token
export async function fetchTransactionsByIdsServer(ids, token) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/by-ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ids }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions by IDs server-side:', error);
    throw error;
  }
}

/**
 * Save transactions to the server
 * @param {Array} transactionData - Array of transaction objects to save
 * @returns {Promise} - Response from the API
 */
export const saveTransactions = async (transactionData) => {
  try {
    
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
    
    const response = await fetch(`${backendUrl}/api/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(transactionData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save transactions');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Helper function to get token safely
const getSafeToken = (serverToken = null) => {
  // If token is provided (from server), use it
  if (serverToken) return serverToken;
  
  // Otherwise check if we're in browser then get from cookie
  if (typeof window !== 'undefined') {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
  }
  
  // If we're on server and no token was provided, return null
  return null;
};

/**
 * Update multiple transactions at once
 * @param {Array} transactions - Array of transaction objects to update
 * @returns {Promise} - Response from the API
 */
export const updateManyTransactions = async (transactions) => {
  const token = Cookies.get('auth_token');
  if (!token) {
    token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1];

    throw new Error('No authentication token found');
  }

  const response = await fetch(`${backendUrl}/api/transactions/update-many`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(transactions),
    credentials: 'include'
  });

  return response; // Return the response object to handle status in the component
};

/**
 * Update a single transaction
 * @param {Object} transaction - Transaction object to update
 * @returns {Promise} - Response from the API
 */
export const updateTransaction = async (transaction) => {
  try {
    return await updateManyTransactions([transaction]);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Fetch a return document by ID
 * @param {string} returnId - ID of the return document to fetch
 * @returns {Promise} - Response from the API
 */
export const fetchReturnById = async (returnId) => {
  try {
    
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
    
    const response = await fetch(`${backendUrl}/api/returns/${returnId}`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to fetch return ${returnId}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Update a return document
 * @param {string} returnId - ID of the return to update
 * @param {Object} returnData - Updated return data
 * @returns {Promise} - Response from the API
 */
export const updateReturnDocumentById = async (returnId, returnData) => {
  try {    
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

    
    const response = await fetch(`${backendUrl}/api/returns/${returnId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(returnData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update return document');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Create a new return document
 * @param {Object} returnData - Return document data
 * @returns {Promise} - Response from the API
 */
export const createReturnDocument = async (returnData) => {
  try {    
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
    
    const response = await fetch(`${backendUrl}/api/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create return document');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Client-side function - uses document.cookie
export const fetchMongoDBTransactions = async () => {
  try {
    // Only use this in client components
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
    
    const response = await fetch(`${backendUrl}/api/transactions`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      console.error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

// Server-side function - receives token as parameter
export const fetchMongoDBTransactionsServer = async (token) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${backendUrl}/api/transactions`, {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions server-side:', error);
    return [];
  }
};


export const fetchAvailableReturns = async () => {
  try {

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
  
  const response = await fetch(`${backendUrl}/api/returns`, {
    headers,
    credentials: 'include'
  });

    if (!response.ok) {
      console.error(`Failed to fetch returns: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching returns:', error);
    return null;
  }
};

/**
 * Fetch a single transaction by ID
 * @param {string} id - ID of the transaction to fetch
 * @returns {Promise} - Response from the API
 */
export const fetchTransactionById = async (id) => {
  try {
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
    
    const response = await fetch(`${backendUrl}/api/transactions/${id}`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to fetch transaction ${id}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Server-side function to fetch a transaction by ID with token
 * @param {string} id - ID of the transaction to fetch
 * @param {string} token - Authentication token
 * @returns {Promise} - Response from the API
 */
export async function fetchTransactionByIdServer(id, token) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching transaction server-side:', error);
    throw error;
  }
}

/**
 * Fetch multiple transactions by their IDs
 * @param {Array} ids - Array of transaction IDs to fetch
 * @returns {Promise} - Response from the API
 */
export const fetchTransactionsByIds = async (ids) => {
  try {
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
      body: JSON.stringify({ ids }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch transactions by IDs');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};