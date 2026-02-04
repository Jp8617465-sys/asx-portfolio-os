import { GET } from '../health/route';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/health', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards the request to the upstream API', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ status: 'ok' }),
    });

    await GET();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/health',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('returns the upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 503,
      text: async () => JSON.stringify({ status: 'degraded' }),
    });

    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('degraded');
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => '{}',
    });

    const response = await GET();

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
