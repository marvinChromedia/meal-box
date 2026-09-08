import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthHeaderProvider } from './auth';
import { ApiClientError, apiRequest } from './http';

function mockResponse(init: { ok: boolean; status: number; json?: () => Promise<unknown> }): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: init.json ?? (() => Promise.resolve({})),
  } as unknown as Response;
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthHeaderProvider(null);
  });

  it('returns the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200, json: () => Promise.resolve({ id: '1' }) }));

    await expect(apiRequest('/recipes/1')).resolves.toEqual({ id: '1' });
  });

  it('returns undefined for a 204 response without reading a body', async () => {
    const json = vi.fn();
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 204, json }));

    await expect(apiRequest('/recipes/1')).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('normalizes an { error: { message, code } } response into ApiClientError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Recipe not found', code: 'NOT_FOUND' } }),
      }),
    );

    await expect(apiRequest('/recipes/missing')).rejects.toMatchObject({
      message: 'Recipe not found',
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('normalizes a non-JSON failure body instead of leaking the parse exception', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, json: () => Promise.reject(new Error('not json')) }),
    );

    await expect(apiRequest('/recipes')).rejects.toMatchObject({
      code: 'NON_JSON_RESPONSE',
      status: 500,
    });
  });

  it('normalizes a rejected fetch (network failure) into ApiClientError', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/recipes')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: null,
    });
    await expect(apiRequest('/recipes')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('attaches headers from the configured auth provider', async () => {
    setAuthHeaderProvider(() => ({ Authorization: 'Bearer test-token' }));
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200, json: () => Promise.resolve({}) }));

    await apiRequest('/recipes');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });
});
