import { GET } from '../portfolio/attribution/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/portfolio/attribution', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request with correct headers and as_of parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ attribution: [] }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio/attribution?as_of=2026-02-04'
    );
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/portfolio/attribution?as_of=2026-02-04',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ attribution: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/portfolio/attribution');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ attribution: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/portfolio/attribution');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
