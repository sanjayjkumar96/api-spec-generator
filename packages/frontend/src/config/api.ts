import axios from 'axios';

// Set the base URL for API calls
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

console.log('API Base URL:', API_BASE_URL);

export { API_BASE_URL };