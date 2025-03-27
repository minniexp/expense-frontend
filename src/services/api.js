import axios from 'axios';

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

// Add return document API methods
export const fetchReturns = async () => {
  try {
    const response = await api.get('/api/returns');
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createReturn = async (returnData) => {
  try {
    const response = await api.post('/api/returns', returnData);
    return response.data;
  } catch (error) {
    console.error('API Error creating return:', error);
    throw error;
  }
};

export const updateReturn = async (id, returnData) => {
  try {
    const response = await api.put(`/api/returns/${id}`, returnData);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const deleteReturn = async (id) => {
  try {
    const response = await api.delete(`/api/returns/${id}`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const fetchReturn = async (id) => {
  try {
    const response = await api.get(`/api/returns/${id}`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};