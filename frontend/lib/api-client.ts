/**
 * API Client for ASX Portfolio OS Backend
 * Centralized HTTP client with error handling and type safety
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://asx-portfolio-os.onrender.com/api/v1';

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    // Add JWT token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Note: API key removed from frontend for security.
    // Frontend now uses JWT-only authentication.
    // API key should only be used for server-to-server communication.

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden - upgrade required');
          break;
        case 429:
          console.error('Rate limit exceeded');
          break;
        case 500:
        case 502:
        case 503:
          console.error('Server error - please try again later');
          break;
        default:
          console.error(`API Error: ${status}`);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - check your connection');
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoint methods
export const api = {
  // Stock search
  search: (query: string) => apiClient.get(`/search`, { params: { q: query } }),

  // Live signals
  getSignal: (ticker: string) => apiClient.get(`/signals/live/${ticker}`),

  getSignalReasoning: (ticker: string) => apiClient.get(`/signals/${ticker}/reasoning`),

  // Historical data
  getHistoricalSignals: (ticker: string, startDate?: string) =>
    apiClient.get(`/signals/historical/${ticker}`, {
      params: { start_date: startDate },
    }),

  // Accuracy metrics
  getAccuracy: (ticker: string, limit: number = 50) =>
    apiClient.get(`/accuracy/${ticker}`, { params: { limit } }),

  // Watchlist
  getWatchlist: () => apiClient.get(`/watchlist`),

  addToWatchlist: (ticker: string) => apiClient.post(`/watchlist`, { ticker }),

  removeFromWatchlist: (ticker: string) => apiClient.delete(`/watchlist/${ticker}`),

  // Portfolio (Phase 3)
  getPortfolio: () => apiClient.get(`/portfolio`),

  uploadPortfolio: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/portfolio/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  analyzePortfolio: () => apiClient.post(`/portfolio/analyze`),

  getRebalancingSuggestions: () => apiClient.get(`/portfolio/rebalance`),

  // User management
  getCurrentUser: () => apiClient.get(`/users/me`),

  updateUserSettings: (settings: Record<string, any>) =>
    apiClient.patch(`/users/me/settings`, settings),

  // Alerts & Notifications (Phase 3)
  getAlertPreferences: () => apiClient.get(`/alerts/preferences`),

  updateAlertPreferences: (preferences: Record<string, any>) =>
    apiClient.put(`/alerts/preferences`, preferences),

  getNotifications: () => apiClient.get(`/notifications`),

  markNotificationAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),

  // Model comparison
  getSignalComparison: (ticker: string) => apiClient.get(`/signals/compare?ticker=${ticker}`),

  // Price history
  getPriceHistory: (
    ticker: string,
    params?: { period?: string; start_date?: string; end_date?: string }
  ) => apiClient.get(`/prices/${ticker}/history`, { params }),
};
