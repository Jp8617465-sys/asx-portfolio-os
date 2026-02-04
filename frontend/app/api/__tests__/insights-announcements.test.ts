import { GET } from '../insights/announcements/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/insights/announcements', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request to asx_announcements endpoint with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ announcements: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/announcements');
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/insights/asx_announcements',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ announcements: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/announcements');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ announcements: [] }),
    });

    const request = new NextRequest('http://localhost:3000/api/insights/announcements');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
