import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests and inject current tab's sessionStorage JWT
api.interceptors.request.use(
  (config) => {
    const token = window.sessionStorage.getItem('wc_jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for auth expiration (401 / 403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.response.data && error.response.data.message === "Invalid email or password.") {
        // Normal login error, do not auto logout
        return Promise.reject(error);
      }
      // Token expired or unauthorized for route: clear current tab auth state
      window.sessionStorage.removeItem('wc_jwt_token');
      window.sessionStorage.removeItem('wc_user');
    }
    return Promise.reject(error);
  }
);

export default api;
