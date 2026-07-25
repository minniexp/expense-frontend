import axios from 'axios';
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

// NOTE: removed. It called the backend host directly, which the browser can no longer do —
// /api/teller/* now requires the server-only internal secret. Use
// fetchTellerTransactionsWithAuth(), which goes through the Next.js proxy.

// export const fetchMonthTransactions = async (month) => {
//   const year = new Date().getFullYear();
//   const response = await api.get(`/transactions/${year}/${month}`);
//   return response.data;
// };

// Add single transaction API method
export const addSingleTransaction = async (transactionData) => {
  try {
      
    const headers = {};
    
    const response = await fetch(`/api/transactions/single`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns`, {
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
  
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns/${id}`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns/${id}`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns/${id}`, {
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

// Fetches Teller Connect setup config (applicationId, environment, enrollmentId for update mode)
export const fetchTellerEnrollmentConfig = async () => {
  const response = await fetch('/api/teller/enrollment-config', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch enrollment config (${response.status})`);
  }

  return await response.json();
};

/**
 * Fetch the Teller transactions that are not yet saved in MongoDB.
 *
 * The backend diffs on tellerTransactionId, so this is idempotent — anything left unsaved
 * shows up again on the next fetch regardless of its date.
 *
 * @param {object} [options]
 * @param {number} [options.days]  lookback window in days (backend default: 90)
 * @param {boolean} [options.all]  ignore the window and consider all available history
 * @returns {Promise<{transactions: Array, summary: object|null}>}
 */
export const fetchTellerTransactionsWithAuth = async (options = {}) => {
  try {

    const headers = {
      'Content-Type': 'application/json'
    };


    const params = new URLSearchParams({ format: 'detailed' });
    if (options.all) {
      params.set('all', 'true');
    } else if (options.days) {
      params.set('days', String(options.days));
    }

    // Same-origin Next.js route handler, not the backend directly. The server attaches the
    // session token and the internal secret; neither is ever exposed to this code.
    const response = await fetch(`/api/teller/transactions?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch Teller transactions');
    }

    const data = await response.json();

    // Tolerate both shapes: an older backend still returns a bare array.
    if (Array.isArray(data)) return { transactions: data, summary: null };
    return { transactions: data.transactions || [], summary: data.summary || null };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// --- Dismissed ("ignored") Teller transactions -------------------------------------------
//
// Reviewed and deliberately not logged. The sync filters them out of future fetches so the
// review queue converges on zero. Reversible — restoring puts them straight back.

/**
 * Mark transactions as reviewed-and-dismissed so they stop appearing in the review list.
 * This does NOT log them — they contribute nothing to totals, returns or points.
 * @param {Array} transactions full transaction objects (a snapshot is stored for the audit list)
 * @param {string} [note] optional reason, applied to all of them
 */
export const ignoreTransactions = async (transactions, note = '') => {
  const response = await fetch('/api/teller/ignored', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions, note }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to ignore transactions');
  }
  return await response.json();
};

/** List everything dismissed so far, newest first. */
export const fetchIgnoredTransactions = async () => {
  const response = await fetch('/api/teller/ignored', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch ignored transactions');
  }
  return await response.json();
};

/** Put dismissed transactions back into the review queue. */
export const restoreIgnoredTransactions = async (ids) => {
  // POST rather than DELETE: a DELETE body is legal but some proxies strip it, which would
  // make restore a silent no-op in production while working fine locally.
  const response = await fetch('/api/teller/ignored/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to restore transactions');
  }
  return await response.json();
};




/**
 * Save transactions to the server
 * @param {Array} transactionData - Array of transaction objects to save
 * @returns {Promise} - Response from the API
 */
export const saveTransactions = async (transactionData) => {
  try {
    
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/transactions`, {
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

/**
 * Update multiple transactions at once
 * @param {Array} transactions - Array of transaction objects to update
 * @returns {Promise} - Response from the API
 */
export const updateManyTransactions = async (transactions) => {
  // Previously read auth_token from a cookie, declared it `const` and then reassigned it —
  // a TypeError — inside a branch that threw unconditionally anyway. Now same-origin, with
  // the httpOnly session cookie sent automatically.
  const response = await fetch('/api/transactions/update-many', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
    
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns/${returnId}`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    

    
    const response = await fetch(`/api/returns/${returnId}`, {
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
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/returns`, {
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

// Client-side function
export const fetchMongoDBTransactions = async () => {
  try {
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/transactions`, {
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


/**
 * Fetch multiple transactions by their IDs
 * @param {Array} ids - Array of transaction IDs to fetch
 * @returns {Promise} - Response from the API
 */
export const fetchTransactionsByIds = async (ids) => {
  try {
      
    const headers = {
      'Content-Type': 'application/json'
    };
    
    
    const response = await fetch(`/api/transactions/by-ids`, {
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

/**
 * Fetch all return documents for pickers and summaries.
 *
 * Restored after an over-broad edit removed it: these functions end with `};`, and the removal
 * pattern was matching a bare `}`, so it swallowed more than it should have.
 */
export const fetchAvailableReturns = async () => {
  try {
    const response = await fetch('/api/returns', { credentials: 'include' });

    if (!response.ok) {
      console.error(`Failed to fetch returns: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching returns:', error);
    return null;
  }
};

// NOTE: fetchTransactionById / fetchTransactionByIdServer are intentionally absent. They
// called GET /api/transactions/:id, which the backend does not route — routes/transactions.js
// only defines GET '/' and GET '/:year/:month', so a single-segment id never matched and the
// call 404'd. Nothing imported them. Removed rather than carried forward broken.

// ---------------------------------------------------------------------------
// Trip expense splitter
// ---------------------------------------------------------------------------
// All same-origin through the Next.js proxy: no credential is held here.
// Amounts cross this boundary in DOLLARS. The backend converts to integer cents
// and does every calculation there — see services/expenseSplitter.js.

const tripFetch = async (path, options = {}) => {
  const res = await fetch(`/api/trips${path}`, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
};

// Roster
export const fetchTripMembers = (includeArchived = false) =>
  tripFetch(`/members${includeArchived ? '?includeArchived=true' : ''}`);
export const createTripMember = (member) => tripFetch('/members', { method: 'POST', body: member });
export const updateTripMember = (id, patch) => tripFetch(`/members/${id}`, { method: 'PUT', body: patch });
export const deleteTripMember = (id) => tripFetch(`/members/${id}`, { method: 'DELETE' });

// Trips
export const fetchTrips = () => tripFetch('');
export const createTrip = (trip) => tripFetch('', { method: 'POST', body: trip });
export const updateTrip = (id, patch) => tripFetch(`/${id}`, { method: 'PUT', body: patch });
export const deleteTrip = (id) => tripFetch(`/${id}`, { method: 'DELETE' });

/** Everything a trip page needs in one request: totals, balances, transfers, expenses, settlements. */
export const fetchTripSummary = (id) => tripFetch(`/${id}/summary`);

// Expenses
export const createTripExpense = (tripId, expense) =>
  tripFetch(`/${tripId}/expenses`, { method: 'POST', body: expense });
export const updateTripExpense = (tripId, expenseId, patch) =>
  tripFetch(`/${tripId}/expenses/${expenseId}`, { method: 'PUT', body: patch });
export const deleteTripExpense = (tripId, expenseId) =>
  tripFetch(`/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });

// Settlements (partial amounts are expected, not exceptional)
export const createTripSettlement = (tripId, settlement) =>
  tripFetch(`/${tripId}/settlements`, { method: 'POST', body: settlement });
export const deleteTripSettlement = (tripId, settlementId) =>
  tripFetch(`/${tripId}/settlements/${settlementId}`, { method: 'DELETE' });
