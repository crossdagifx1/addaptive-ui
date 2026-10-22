import { describe, it, expect, vi } from 'vitest';
import { createBlueprintClient } from '../src/index.js';

describe('@aui/sdk-node', () => {
  it('constructs client and sends authenticated blueprint requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        blueprintId: 'bp_node_1',
        schemaVersion: '1.0',
        pageId: 'dashboard',
        segment: 'enterprise',
      }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const client = createBlueprintClient({
      apiKey: 'test-api-key',
      siteId: 'site_123',
      apiEndpoint: 'https://api.test.aui.dev',
    });

    const bp = await client.getBlueprint('dashboard', 'enterprise');

    expect(bp.blueprintId).toBe('bp_node_1');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api.test.aui.dev/v1/blueprints');
    expect(url).toContain('pageId=dashboard');
    expect(url).toContain('siteId=site_123');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key');
    expect((init.headers as Record<string, string>)['x-aui-site-id']).toBe('site_123');

    vi.unstubAllGlobals();
  });

  it('submits signals with site identification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const client = createBlueprintClient({
      apiKey: 'test-key',
      siteId: 'site_abc',
    });

    await client.submitSignals([{ type: 'conversion', value: 100 }]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      siteId: 'site_abc',
      signals: [{ type: 'conversion', value: 100 }],
    });

    vi.unstubAllGlobals();
  });
});
