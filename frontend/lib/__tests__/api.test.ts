// lib/api.ts uses a module-level `request()` that calls global fetch.
// We mock fetch to control responses.

const originalFetch = global.fetch;

beforeEach(() => {
  (global as any).fetch = jest.fn();
});

afterEach(() => {
  (global as any).fetch = originalFetch;
});

const mockFetch = () => (global as any).fetch as jest.Mock;

// Helper to create a mock Response
function mockResponse(body: any, status = 200) {
  const isOk = status >= 200 && status < 300;
  return {
    ok: isOk,
    status,
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    json: jest.fn().mockResolvedValue(body),
  };
}

// We need to re-import the module each time to get fresh module-level variables.
// Since BASE_URL is computed at module load, we set the env before requiring.
// In jsdom, typeof window !== 'undefined', so BASE_URL = INTERNAL_BASE = "/api"
describe('lib/api — request layer', () => {
  // Lazy-load to pick up the fetch mock
  let api: typeof import('../api');

  beforeEach(async () => {
    jest.resetModules();
    api = await import('../api');
  });

  it('getHealth resolves with parsed JSON on success', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    const result = await api.getHealth();
    expect(result).toEqual({ status: 'ok' });
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });

  it('getHealth throws on non-ok response', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse('Not Found', 404));
    await expect(api.getHealth()).rejects.toThrow();
  });

  it('getModelStatusSummary calls fetch with model query param', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', model: 'model_a_ml' }));
    await api.getModelStatusSummary('model_a_ml');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
  });

  it('getDriftSummary calls fetch with model param', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getDriftSummary('model_a_ml');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
  });

  it('sendAssistantChat sends POST with query body', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ reply: 'hello back' }));
    const result = await api.sendAssistantChat('hello');
    expect(result).toEqual({ reply: 'hello back' });
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('/assistant/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'hello' }),
      })
    );
  });

  it('getFeatureImportance includes model and limit params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', features: [] }));
    await api.getFeatureImportance('model_a_ml', 5);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
      expect.any(Object)
    );
  });

  it('getPortfolioAttribution includes asOf when provided', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getPortfolioAttribution('model_a_v1_1', '2026-01-01');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('as_of=2026-01-01'),
      expect.any(Object)
    );
  });

  it('getPortfolioAttribution omits asOf when not provided', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getPortfolioAttribution('model_a_v1_1');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.not.stringContaining('as_of'),
      expect.any(Object)
    );
  });

  it('getLoanSummary calls with limit param', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getLoanSummary(20);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      expect.any(Object)
    );
  });

  it('getAsxAnnouncements calls with limit and lookback_days', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getAsxAnnouncements(5, 14);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('lookback_days=14'),
      expect.any(Object)
    );
  });

  it('error includes status and body text', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse('Server Error', 500));
    try {
      await api.getHealth();
      expect.assertions(1); // should not reach here
    } catch (e: any) {
      expect(e.status).toBe(500);
      expect(e.body).toBe('Server Error');
    }
  });

  it('getSignalsLive calls with model and limit', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', signals: [] }));
    await api.getSignalsLive('model_a_ml', 10);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
  });

  it('getModelCompare calls with left and right versions', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getModelCompare('model_a_ml', 'v1_1', 'v1_2');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('left_version=v1_1'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('right_version=v1_2'),
      expect.any(Object)
    );
  });

  it('getModelCompare omits versions when not provided', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getModelCompare('model_a_ml');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.not.stringContaining('left_version'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.not.stringContaining('right_version'),
      expect.any(Object)
    );
  });

  it('getDashboard calls with asOf and default model', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getDashboard('2026-01-15');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('as_of=2026-01-15'),
      expect.any(Object)
    );
  });

  it('getDashboard calls with custom model', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getDashboard('2026-01-15', 'custom_model');
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=custom_model'),
      expect.any(Object)
    );
  });

  it('getModelExplainability uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', features: [] }));
    await api.getModelExplainability();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model_version=v1_2'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      expect.any(Object)
    );
  });

  it('getModelExplainability uses custom params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', features: [] }));
    await api.getModelExplainability('v2_0', 50);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model_version=v2_0'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=50'),
      expect.any(Object)
    );
  });

  it('getPortfolioPerformance uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', series: [] }));
    await api.getPortfolioPerformance();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_v1_1'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=30'),
      expect.any(Object)
    );
  });

  it('getPortfolioPerformance uses custom params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', series: [] }));
    await api.getPortfolioPerformance('custom_model', 100);
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=custom_model'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=100'),
      expect.any(Object)
    );
  });

  it('getFeatureImportance uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', features: [] }));
    await api.getFeatureImportance();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    );
  });

  it('getAsxAnnouncements uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', items: [] }));
    await api.getAsxAnnouncements();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('lookback_days=30'),
      expect.any(Object)
    );
  });

  it('getLoanSummary uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok' }));
    await api.getLoanSummary();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    );
  });

  it('getSignalsLive uses default params', async () => {
    mockFetch().mockResolvedValueOnce(mockResponse({ status: 'ok', signals: [] }));
    await api.getSignalsLive();
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('model=model_a_ml'),
      expect.any(Object)
    );
    expect(mockFetch()).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      expect.any(Object)
    );
  });
});
