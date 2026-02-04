import { POST } from '../assistant/chat/route';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('API Route: /api/assistant/chat', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards POST request with correct headers and body', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ reply: 'AI response' }),
    });

    const request = new Request('http://localhost:3000/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'Hello' }),
    });

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/assistant/chat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
        body: JSON.stringify({ query: 'Hello' }),
        cache: 'no-store',
      })
    );
  });

  it('returns upstream response with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 503,
      text: async () => JSON.stringify({ error: 'Service unavailable' }),
    });

    const request = new Request('http://localhost:3000/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'Hello' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('Service unavailable');
  });

  it('includes correct Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ reply: 'AI response' }),
    });

    const request = new Request('http://localhost:3000/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'Hello' }),
    });

    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
