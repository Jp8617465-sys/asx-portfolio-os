/**
 * API Client for ASX Portfolio OS Backend
 * Centralized HTTP client with error handling and type safety
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Use local proxy routes for client-side calls
const API_BASE_URL = '';

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - proxy routes handle authentication
apiClient.interceptors.request.use(
  (config) => {
    // Proxy routes will add proper authentication (JWT from cookie or API key)
    // No need to add tokens here for client-side calls
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling with retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // User-friendly error messages
    const errorMessages: Record<number, string> = {
      401: 'Your session has expired. Please log in again.',
      403: 'You do not have permission to access this resource.',
      404: 'The requested resource was not found.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Server error. Our team has been notified.',
      502: 'Bad gateway. Please try again later.',
      503: 'Service temporarily unavailable. Please try again later.',
    };

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = errorMessages[status] || error.message;

      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        console.error(`API Error ${status}:`, message);
      }

      // Redirect to login on 401
      if (status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      // Retry on 5xx errors (max 3 retries with exponential backoff)
      if (status >= 500 && status < 600 && !originalRequest._retry && retryCount < MAX_RETRIES) {
        originalRequest._retry = true;
        retryCount++;

        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`Retrying request (${retryCount}/${MAX_RETRIES}) after ${backoffDelay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return apiClient(originalRequest);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - check your connection');
    }

    // Reset retry count on successful error handling
    if (retryCount > 0) {
      retryCount = 0;
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoint methods
export const api = {
  // Authentication (via proxy)
  login: (username: string, password: string) =>
    apiClient.post(`/api/auth/login`, { username, password }),

  register: (username: string, email: string, password: string, full_name?: string) =>
    apiClient.post(`/api/auth/register`, { username, email, password, full_name }),

  // Stock search (via proxy)
  search: (query: string) => apiClient.get(`/api/search`, { params: { q: query } }),

  // Live signals (via proxy)
  getSignal: (ticker: string) => apiClient.get(`/api/signals/${ticker}`),

  getSignalReasoning: (ticker: string) => apiClient.get(`/api/signals/${ticker}/reasoning`),

  getTopSignals: (params?: { limit?: number; signal?: string }) =>
    apiClient.get('/api/signals/top', { params }),

  // Accuracy metrics (via proxy)
  getAccuracy: (ticker: string, limit: number = 50) =>
    apiClient.get(`/api/accuracy/${ticker}`, { params: { limit } }),

  // Watchlist (via proxy)
  getWatchlist: () => apiClient.get(`/api/watchlist`),

  addToWatchlist: (ticker: string) => apiClient.post(`/api/watchlist`, { ticker }),

  removeFromWatchlist: (ticker: string) => apiClient.delete(`/api/watchlist/${ticker}`),

  // Portfolio (via proxy)
  getPortfolio: () => apiClient.get(`/api/portfolio`),

  uploadPortfolio: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/portfolio/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  analyzePortfolio: () => apiClient.post(`/portfolio/analyze`),

  getRebalancingSuggestions: () => apiClient.get(`/api/portfolio/rebalancing`),

  // User management
  getCurrentUser: () => apiClient.get(`/users/me`),

  updateUserSettings: (settings: Record<string, any>) =>
    apiClient.patch(`/users/me/settings`, settings),

  // Alerts & Notifications (via proxy)
  getAlertPreferences: () => apiClient.get(`/api/alerts/preferences`),

  updateAlertPreferences: (preferences: Record<string, any>) =>
    apiClient.put(`/api/alerts/preferences`, preferences),

  getNotifications: () => apiClient.get(`/api/notifications`),

  markNotificationAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),

  // Model comparison
  getSignalComparison: (ticker: string) => apiClient.get(`/signals/compare?ticker=${ticker}`),

  // Price history (via proxy)
  getPriceHistory: (
    ticker: string,
    params?: { period?: string; start_date?: string; end_date?: string }
  ) => apiClient.get(`/api/prices/${ticker}/history`, { params }),

  // Model B - Fundamentals (via proxy)
  getModelBSignals: (params?: { limit?: number; minGrade?: string }) =>
    apiClient.get('/api/signals/model_b/latest', { params }),

  getModelBSignal: (ticker: string) => apiClient.get(`/api/signals/model_b/${ticker}`),

  getFundamentalMetrics: (ticker?: string) =>
    apiClient.get('/api/fundamentals/metrics', { params: ticker ? { ticker } : undefined }),

  // Model C - Sentiment (via proxy)
  getModelCSignals: (params?: { limit?: number }) =>
    apiClient.get('/api/signals/model_c/latest', { params }),

  getModelCSignal: (ticker: string) => apiClient.get(`/api/signals/model_c/${ticker}`),

  // Ensemble signals (via proxy)
  getEnsembleSignals: (params?: { limit?: number; agreement_only?: boolean }) =>
    apiClient.get('/api/signals/ensemble/latest', { params }),

  getEnsembleSignal: (ticker: string) => apiClient.get(`/api/signals/ensemble/${ticker}`),

  // Drift monitoring (via proxy)
  getDriftSummary: () => apiClient.get('/api/drift/summary'),

  getFeatureDrift: () => apiClient.get('/api/drift/features'),

  getDriftHistory: (params?: { feature_name?: string; days?: number }) =>
    apiClient.get('/api/drift/history', { params }),

  // News & Sentiment (via proxy)
  getTickerNews: (ticker: string, params?: { days?: number; limit?: number }) =>
    apiClient.get(`/api/news/${ticker}`, { params }),

  getLatestNews: (params?: { limit?: number }) =>
    apiClient.get('/api/news/sentiment/summary', { params }),

  getSentimentSummary: (params?: { days?: number }) =>
    apiClient.get('/api/sentiment/summary', { params }),

  // Portfolio Fusion (via proxy)
  getPortfolioFusion: () => apiClient.get('/api/portfolio/fusion'),

  getPortfolioRisk: () => apiClient.get('/api/portfolio/fusion/risk'),

  getPortfolioAllocation: () => apiClient.get('/api/portfolio/fusion/allocation'),

  refreshPortfolioFusion: () => apiClient.post('/api/portfolio/fusion'),

  // Direct axios access for additional endpoints
  get: apiClient.get,
  post: apiClient.post,
  put: apiClient.put,
  delete: apiClient.delete,
};
