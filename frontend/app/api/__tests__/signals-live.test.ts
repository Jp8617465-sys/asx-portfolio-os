import { GET } from '../signals/live/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/signals/live', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request with correct headers and default parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ signals: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/signals/live');
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/signals/live?model=model_a_ml&limit=20',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ signals: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/signals/live');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ signals: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/signals/live');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
