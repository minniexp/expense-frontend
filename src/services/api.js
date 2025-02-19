// import axios from 'axios';

// const api = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
// });

// export const fetchTransactions = async () => {
//   const response = await api.get('/transactions');
//   return response.data;
// };

// export const fetchMonthTransactions = async (month) => {
//   const year = new Date().getFullYear();
//   const response = await api.get(`/transactions/${year}/${month}`);
//   return response.data;
// };