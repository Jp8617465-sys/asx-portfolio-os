/**
 * API Client Tests - Including Interceptor Logic
 */

// Mock axios module - store interceptor callbacks in the mock instance itself
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    _interceptorCallbacks: {
      requestFulfill: null as any,
      requestReject: null as any,
      responseFulfill: null as any,
      responseReject: null as any,
    },
    interceptors: {
      request: {
        use: jest.fn(function (this: any, fulfill: any, reject: any) {
          mockInstance._interceptorCallbacks.requestFulfill = fulfill;
          mockInstance._interceptorCallbacks.requestReject = reject;
        }),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(function (this: any, fulfill: any, reject: any) {
          mockInstance._interceptorCallbacks.responseFulfill = fulfill;
          mockInstance._interceptorCallbacks.responseReject = reject;
        }),
        eject: jest.fn(),
      },
    },
  };

  return {
    create: jest.fn(() => mockInstance),
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
    },
  };
});

// Import after mock is set up
import axios from 'axios';
import { api } from '../api-client';

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = (mockAxios.create as jest.Mock).mock.results[0]?.value;

// Access interceptor callbacks from the mock instance
const getInterceptorCallbacks = () => mockAxiosInstance._interceptorCallbacks;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Methods', () => {
    describe('search', () => {
      it('searches for stocks with query parameter', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { results: [{ ticker: 'CBA.AX' }] },
        });

        const result = await api.search('CBA');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
          params: { q: 'CBA' },
        });
        expect(result.data.results).toHaveLength(1);
      });
    });

    describe('getSignal', () => {
      it('fetches live signal for ticker', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { signal: 'BUY', confidence: 75 },
        });

        await api.getSignal('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/signals/live/CBA.AX');
      });
    });

    describe('getSignalReasoning', () => {
      it('fetches signal reasoning', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { reasoning: 'Strong fundamentals' },
        });

        await api.getSignalReasoning('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/signals/CBA.AX/reasoning');
      });
    });

    describe('getHistoricalSignals', () => {
      it('fetches historical signals with default params', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { signals: [] },
        });

        await api.getHistoricalSignals('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/signals/historical/CBA.AX', {
          params: { start_date: undefined },
        });
      });

      it('fetches historical signals with start date', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { signals: [] },
        });

        await api.getHistoricalSignals('CBA.AX', '2026-01-01');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/signals/historical/CBA.AX', {
          params: { start_date: '2026-01-01' },
        });
      });
    });

    describe('getAccuracy', () => {
      it('fetches accuracy with default limit', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { accuracy: 85 },
        });

        await api.getAccuracy('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/accuracy/CBA.AX', {
          params: { limit: 50 },
        });
      });

      it('fetches accuracy with custom limit', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { accuracy: 85 },
        });

        await api.getAccuracy('CBA.AX', 100);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/accuracy/CBA.AX', {
          params: { limit: 100 },
        });
      });
    });

    describe('getWatchlist', () => {
      it('fetches user watchlist', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { tickers: ['CBA.AX', 'BHP.AX'] },
        });

        await api.getWatchlist();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/watchlist');
      });
    });

    describe('addToWatchlist', () => {
      it('adds ticker to watchlist', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.addToWatchlist('CBA.AX');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/watchlist', {
          ticker: 'CBA.AX',
        });
      });
    });

    describe('removeFromWatchlist', () => {
      it('removes ticker from watchlist', async () => {
        mockAxiosInstance.delete.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.removeFromWatchlist('CBA.AX');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/watchlist/CBA.AX');
      });
    });

    describe('getPortfolio', () => {
      it('fetches portfolio', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { holdings: [] },
        });

        await api.getPortfolio();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/portfolio');
      });
    });

    describe('uploadPortfolio', () => {
      it('uploads portfolio file', async () => {
        const file = new File(['content'], 'portfolio.csv');
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.uploadPortfolio(file);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/portfolio/upload',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
      });
    });

    describe('analyzePortfolio', () => {
      it('triggers portfolio analysis', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { status: 'analyzing' },
        });

        await api.analyzePortfolio();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/portfolio/analyze');
      });
    });

    describe('getRebalancingSuggestions', () => {
      it('fetches rebalancing suggestions', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { suggestions: [] },
        });

        await api.getRebalancingSuggestions();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/portfolio/rebalance');
      });
    });

    describe('getCurrentUser', () => {
      it('fetches current user', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { id: '123', email: 'user@example.com' },
        });

        await api.getCurrentUser();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/me');
      });
    });

    describe('updateUserSettings', () => {
      it('updates user settings', async () => {
        const settings = { theme: 'dark' };
        mockAxiosInstance.patch.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.updateUserSettings(settings);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/users/me/settings', settings);
      });
    });

    describe('getAlertPreferences', () => {
      it('fetches alert preferences', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { email_alerts: true },
        });

        await api.getAlertPreferences();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alerts/preferences');
      });
    });

    describe('updateAlertPreferences', () => {
      it('updates alert preferences', async () => {
        const preferences = { email_alerts: false };
        mockAxiosInstance.put.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.updateAlertPreferences(preferences);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/alerts/preferences', preferences);
      });
    });

    describe('getNotifications', () => {
      it('fetches notifications', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { notifications: [] },
        });

        await api.getNotifications();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/notifications');
      });
    });

    describe('markNotificationAsRead', () => {
      it('marks notification as read', async () => {
        mockAxiosInstance.put.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.markNotificationAsRead('123');

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/notifications/123/read');
      });
    });
  });

  describe('Request Interceptor', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('adds Authorization header when token exists in localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('test-jwt-token');
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {} as any };
      const result = callbacks.requestFulfill(config);

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
    });

    it('does not add Authorization header when no token exists', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {} as any };
      const result = callbacks.requestFulfill(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('adds x-api-key header when API key exists in env', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      process.env.NEXT_PUBLIC_OS_API_KEY = 'test-api-key';
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {} as any };
      const result = callbacks.requestFulfill(config);

      expect(result.headers['x-api-key']).toBe('test-api-key');
    });

    it('does not add x-api-key header when API key is not set', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      delete process.env.NEXT_PUBLIC_OS_API_KEY;
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {} as any };
      const result = callbacks.requestFulfill(config);

      expect(result.headers['x-api-key']).toBeUndefined();
    });

    it('returns config object', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {}, url: '/test' } as any;
      const result = callbacks.requestFulfill(config);

      expect(result).toBe(config);
    });

    it('request interceptor reject handler returns rejected promise', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = new Error('Request setup error');
      await expect(callbacks.requestReject(error)).rejects.toThrow('Request setup error');
    });
  });

  describe('Response Interceptor', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('passes through successful response unchanged', () => {
      const callbacks = getInterceptorCallbacks();
      const response = { data: { success: true }, status: 200 };
      const result = callbacks.responseFulfill(response);
      expect(result).toBe(response);
    });

    it('handles 401 error by redirecting to login', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 401 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(window.location.href).toBe('/login');
    });

    it('handles 403 error with console message', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 403 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Access forbidden - upgrade required');
    });

    it('handles 429 rate limit error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 429 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Rate limit exceeded');
    });

    it('handles 500 server error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 500 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Server error - please try again later');
    });

    it('handles 502 server error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 502 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Server error - please try again later');
    });

    it('handles 503 server error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 503 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Server error - please try again later');
    });

    it('handles other status codes with generic error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 400 },
        request: {},
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('API Error: 400');
    });

    it('handles network error (no response)', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        request: {},
        response: undefined,
      };

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Network error - check your connection');
    });

    it('handles error with no request or response', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {};

      await expect(callbacks.responseReject(error)).rejects.toBe(error);
      // Should not throw, just reject with original error
    });
  });
});
