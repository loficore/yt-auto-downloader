import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { requestApi } from '../../src/utils/api';

const mockFetch = vi.fn();

globalThis.fetch = mockFetch;

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requestApi returns data on successful response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: '1', name: 'Test' },
      }),
    });

    const result = await requestApi(
      'http://localhost/api/test',
      (data): data is { id: string; name: string } =>
        typeof data === 'object' && data !== null && 'id' in data && 'name' in data,
    );

    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('requestApi throws on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      requestApi('http://localhost/api/test', (data) => !!data),
    ).rejects.toThrow('HTTP 404: Not Found');
  });

  it('requestApi throws on invalid JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(
      requestApi('http://localhost/api/test', (data) => !!data),
    ).rejects.toThrow('响应 JSON 解析失败');
  });

  it('requestApi throws on invalid response structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: 'structure' }),
    });

    await expect(
      requestApi('http://localhost/api/test', (data) => !!data),
    ).rejects.toThrow('响应结构不合法');
  });

  it('requestApi throws on success: false with error message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Custom error message',
      }),
    });

    await expect(
      requestApi('http://localhost/api/test', (data) => !!data),
    ).rejects.toThrow('Custom error message');
  });

  it('requestApi throws on success: false without error message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
      }),
    });

    await expect(
      requestApi('http://localhost/api/test', (data) => !!data),
    ).rejects.toThrow('请求失败');
  });

  it('requestApi throws when data fails validation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { invalid: 'data' },
      }),
    });

    const validateData = (data: unknown): data is { id: string } =>
      typeof data === 'object' && data !== null && 'id' in data;

    await expect(
      requestApi('http://localhost/api/test', validateData),
    ).rejects.toThrow('响应 data 结构不合法');
  });

  it('requestApi passes through request init', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { result: 'ok' },
      }),
    });

    await requestApi('http://localhost/api/test', (data) => !!data, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      }),
    );
  });
});
