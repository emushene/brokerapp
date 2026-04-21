import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: 'http://localhost:5137/api', // Match your actual API backend port
});

// Interceptor to add Firebase JWT token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      console.log('Request token successfully retrieved');
      config.headers.Authorization = `Bearer ${token}`;
    } catch (tokenError) {
      console.error('Error getting auth token:', tokenError);
    }
  } else {
    console.warn('No authenticated user found for request to:', config.url);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
