import type { Blueprint } from '@aui/schema';
import type { NodeSDKConfig, BlueprintClient } from './types.js';

/**
 * Creates an authenticated Node.js SDK client for server-side integrations (Next.js, Remix, Fastify, Express).
 */
export function createBlueprintClient(config: NodeSDKConfig): BlueprintClient {
  const endpoint = (config.apiEndpoint || 'https://api.aui.dev').replace(/\/$/, '');

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'x-aui-site-id': config.siteId,
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AUI Node SDK Error (${res.status}): ${errText}`);
    }

    return (await res.json()) as T;
  };

  return {
    async getBlueprint(pageId: string, segmentKey: string): Promise<Blueprint> {
      const params = new URLSearchParams({ pageId, segment: segmentKey, siteId: config.siteId });
      return request<Blueprint>(`/v1/blueprints?${params.toString()}`);
    },

    async submitSignals(signals: unknown[]): Promise<void> {
      await request<void>('/v1/signals', {
        method: 'POST',
        body: JSON.stringify({ siteId: config.siteId, signals }),
      });
    },

    async generateBlueprint(pageId: string, segmentKey: string): Promise<Blueprint> {
      return request<Blueprint>('/v1/blueprints/generate', {
        method: 'POST',
        body: JSON.stringify({ siteId: config.siteId, pageId, segmentKey }),
      });
    },
  };
}
