import { GET } from '../model/status/summary/route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/model/status/summary', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards request with correct headers and default model parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ model: 'model_a_ml', status: 'healthy' }),
    });

    const request = new NextRequest('http://localhost:3000/api/model/status/summary');
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/model/status/summary?model=model_a_ml',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('forwards request with custom model parameter from query string', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ model: 'custom_model', status: 'healthy' }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/model/status/summary?model=custom_model'
    );
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/model/status/summary?model=custom_model',
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status and headers', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ model: 'model_a_ml', status: 'healthy' }),
    });

    const request = new NextRequest('http://localhost:3000/api/model/status/summary');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
