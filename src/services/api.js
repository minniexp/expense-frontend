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