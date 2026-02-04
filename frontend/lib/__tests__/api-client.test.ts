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
      requestFulfill: null as ((config: any) => any) | null,
      requestReject: null as ((error: any) => Promise<never>) | null,
      responseFulfill: null as ((response: any) => any) | null,
      responseReject: null as ((error: any) => Promise<never>) | null,
    },
    interceptors: {
      request: {
        use: jest.fn(function (fulfill: any, reject: any) {
          mockInstance._interceptorCallbacks.requestFulfill = fulfill;
          mockInstance._interceptorCallbacks.requestReject = reject;
        }),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(function (fulfill: any, reject: any) {
          mockInstance._interceptorCallbacks.responseFulfill = fulfill;
          mockInstance._interceptorCallbacks.responseReject = reject;
        }),
        eject: jest.fn(),
      },
    },
  };

  // Make mockInstance callable for retry logic
  const callableMock = Object.assign(
    jest.fn().mockImplementation(() => Promise.resolve({ data: {} })),
    mockInstance
  );

  return {
    create: jest.fn(() => callableMock),
    __esModule: true,
    default: {
      create: jest.fn(() => callableMock),
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

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/search', {
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

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/signals/CBA.AX');
      });
    });

    describe('getSignalReasoning', () => {
      it('fetches signal reasoning', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { reasoning: 'Strong fundamentals' },
        });

        await api.getSignalReasoning('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/signals/CBA.AX/reasoning');
      });
    });

    describe('getAccuracy', () => {
      it('fetches accuracy with default limit', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { accuracy: 85 },
        });

        await api.getAccuracy('CBA.AX');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/accuracy/CBA.AX', {
          params: { limit: 50 },
        });
      });

      it('fetches accuracy with custom limit', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { accuracy: 85 },
        });

        await api.getAccuracy('CBA.AX', 100);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/accuracy/CBA.AX', {
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

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/watchlist');
      });
    });

    describe('addToWatchlist', () => {
      it('adds ticker to watchlist', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.addToWatchlist('CBA.AX');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/watchlist', {
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

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/watchlist/CBA.AX');
      });
    });

    describe('getPortfolio', () => {
      it('fetches portfolio', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { holdings: [] },
        });

        await api.getPortfolio();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/portfolio');
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
          '/api/portfolio/upload',
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

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/portfolio/rebalancing');
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

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/alerts/preferences');
      });
    });

    describe('updateAlertPreferences', () => {
      it('updates alert preferences', async () => {
        const preferences = { email_alerts: false };
        mockAxiosInstance.put.mockResolvedValueOnce({
          data: { success: true },
        });

        await api.updateAlertPreferences(preferences);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/alerts/preferences', preferences);
      });
    });

    describe('getNotifications', () => {
      it('fetches notifications', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { notifications: [] },
        });

        await api.getNotifications();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/notifications');
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
    it('returns config unchanged (proxy handles auth)', () => {
      const callbacks = getInterceptorCallbacks();

      const config = { headers: {}, url: '/test' };
      const result = callbacks.requestFulfill!(config);

      expect(result).toBe(config);
    });

    it('request interceptor reject handler returns rejected promise', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = new Error('Request setup error');
      await expect(callbacks.requestReject!(error)).rejects.toThrow('Request setup error');
    });
  });

  describe('Response Interceptor', () => {
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });
      console.error = jest.fn();
      console.log = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
      console.log = originalConsoleLog;
    });

    it('passes through successful response unchanged', () => {
      const callbacks = getInterceptorCallbacks();
      const response = { data: { success: true }, status: 200 };
      const result = callbacks.responseFulfill!(response);
      expect(result).toBe(response);
    });

    it('handles 401 error by redirecting to login', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 401 },
        config: {},
        message: 'Unauthorized',
      };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      expect(window.location.href).toBe('/login');
    });

    it('handles 403 error with console message', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 403 },
        config: {},
        message: 'Forbidden',
      };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith(
        'API Error 403:',
        'You do not have permission to access this resource.'
      );
    });

    it('handles 429 rate limit error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 429 },
        config: {},
        message: 'Too Many Requests',
      };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith(
        'API Error 429:',
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('handles other status codes with generic error', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        response: { status: 400 },
        config: {},
        message: 'Bad Request',
      };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('API Error 400:', 'Bad Request');
    });

    it('handles network error (no response)', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = {
        request: {},
        response: undefined,
        config: {},
      };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      expect(console.error).toHaveBeenCalledWith('Network error - check your connection');
    });

    it('handles error with no request or response', async () => {
      const callbacks = getInterceptorCallbacks();
      const error = { config: {} };

      await expect(callbacks.responseReject!(error)).rejects.toBe(error);
      // Should not throw, just reject with original error
    });
  });
});
