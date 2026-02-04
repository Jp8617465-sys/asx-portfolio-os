import { GET } from '../dashboard/model_a_v1_1/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/dashboard/model_a_v1_1', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request with correct headers and as_of parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ dashboard_data: {} }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/model_a_v1_1?as_of=2026-02-04'
    );
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/dashboard/model_a_v1_1?as_of=2026-02-04&model=model_a_v1_1',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ dashboard_data: {} }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/model_a_v1_1?as_of=2026-02-04'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ dashboard_data: {} }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/model_a_v1_1?as_of=2026-02-04'
    );
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
