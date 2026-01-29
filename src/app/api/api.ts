import axios from 'axios';

const api = axios.create({
  baseURL: process.env.BACKEND_API_URL || 'http://localhost:3002',
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;