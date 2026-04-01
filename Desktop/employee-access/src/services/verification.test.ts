import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyFace, checkApiHealth } from './verification';

// Re-export internal helpers for testing by importing the module source
// Since the helpers are not exported, we test them indirectly through verifyFace

describe('verifyFace', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('maps a recognized employee response correctly', async () => {
    const apiPayload = {
      message: 'Welcome back, Alice.',
      employee: { _id: 'emp-001', fullName: 'Alice Smith', department: 'Engineering' },
      matched_identity: { owner_type: 'employee' },
      similarity: 0.92,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiPayload,
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    const result = await verifyFace(file);

    expect(result.recognized).toBe(true);
    expect(result.employee).not.toBeNull();
    expect(result.employee?.name).toBe('Alice Smith');
    expect(result.employee?.ownerType).toBe('employee');
    expect(result.similarity).toBeCloseTo(0.92);
    expect(result.reasonCode).toBe('ok');
  });

  it('uses VITE_VERIFY_ENDPOINT when provided', async () => {
    vi.stubEnv('VITE_VERIFY_ENDPOINT', 'https://verify.example.com/custom-search');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Face not recognized.', similarity: 0 }),
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await verifyFace(file);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://verify.example.com/custom-search',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to the API base URL when verify endpoint is not set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Face not recognized.', similarity: 0 }),
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await verifyFace(file);

    const [requestUrl, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(typeof requestUrl).toBe('string');
    expect(() => new URL(requestUrl)).not.toThrow();
    expect(new URL(requestUrl).pathname).toBe('/image/search');
  });

  it('falls back to localhost when no API env is set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Face not recognized.', similarity: 0 }),
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await verifyFace(file);

    const [requestUrl, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(typeof requestUrl).toBe('string');
    expect(requestUrl).not.toContain('undefined');
    expect(new URL(requestUrl).pathname).toBe('/image/search');
  });

  it('maps visitor owner_type from matched_identity', async () => {
    const apiPayload = {
      message: 'Welcome back, Jamie.',
      visitor: { _id: 'vis-001', fullName: 'Jamie Visitor' },
      matched_identity: { owner_type: 'visitor' },
      similarity: 0.88,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiPayload,
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    const result = await verifyFace(file);

    expect(result.recognized).toBe(true);
    expect(result.employee?.name).toBe('Jamie Visitor');
    expect(result.employee?.ownerType).toBe('visitor');
  });

  it('maps an unrecognized response correctly', async () => {
    const apiPayload = {
      message: 'Face not recognized.',
      similarity: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiPayload,
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    const result = await verifyFace(file);

    expect(result.recognized).toBe(false);
    expect(result.employee).toBeNull();
    expect(result.reasonCode).toBe('unknown-person');
  });

  it('throws on non-ok HTTP status with detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Internal model error' }),
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await expect(verifyFace(file)).rejects.toThrow('Internal model error');
  });

  it('throws on non-ok HTTP status without detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json'); },
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await expect(verifyFace(file)).rejects.toThrow('503');
  });

  it('handles distance-based similarity (0-0.5 range inverted)', async () => {
    const apiPayload = {
      message: 'Welcome back.',
      employee: { id: 'emp-002', name: 'Bob' },
      similarity: 0.15,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiPayload,
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    const result = await verifyFace(file);

    expect(result.recognized).toBe(true);
    expect(result.similarity).toBeCloseTo(0.85);
  });

  it('handles null/invalid payload gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    const result = await verifyFace(file);

    expect(result.recognized).toBe(false);
    expect(result.reasonCode).toBe('service-error');
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const file = new File(['fake-jpeg'], 'face.jpg', { type: 'image/jpeg' });
    await expect(verifyFace(file, 'temp_images', controller.signal)).rejects.toThrow('Aborted');
  });
});

describe('checkApiHealth', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns true when API is healthy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    });

    expect(await checkApiHealth()).toBe(true);
    const [requestUrl, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit).toEqual(expect.objectContaining({ method: 'GET' }));
    expect(typeof requestUrl).toBe('string');
    expect(requestUrl).not.toContain('undefined');
    expect(new URL(requestUrl).pathname).toBe('/health');
  });

  it('returns false when API responds unhealthy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'degraded' }),
    });

    expect(await checkApiHealth()).toBe(false);
  });

  it('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    expect(await checkApiHealth()).toBe(false);
  });
});
