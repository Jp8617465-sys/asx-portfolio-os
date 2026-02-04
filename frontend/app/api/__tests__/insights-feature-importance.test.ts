import { GET } from '../insights/feature-importance/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/insights/feature-importance', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ features: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/feature-importance');
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/insights/feature-importance',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ features: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/feature-importance');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ features: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/feature-importance');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
