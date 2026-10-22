import type { ModelAdapter } from '../adapter.js';
import type { GenerateRequest, GenerateResult, CostEstimate } from '../types.js';

export interface GenericHttpAdapterConfig {
  endpoint: string;
  headers?: Record<string, string>;
  transformRequest?: (request: GenerateRequest) => unknown;
  transformResponse?: (response: unknown) => GenerateResult;
}

/**
 * Generic HTTP model adapter.
 * Allows customers to connect custom endpoints, private proxies, or enterprise gateways.
 */
export function createGenericHttpAdapter(config: GenericHttpAdapterConfig): ModelAdapter {
  return {
    id: `http:${config.endpoint}`,

    capabilities: {
      structuredOutput: 'prompted',
      maxContextTokens: 64000,
      supportsStreaming: false,
      supportsImages: false,
    },

    estimateCost(request: GenerateRequest): CostEstimate {
      const inputTokens = Math.ceil((request.system.length + request.input.length) / 4);
      const outputTokens = request.maxOutputTokens || 1000;
      return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: 0,
        estimatedLatencyMs: 1000,
      };
    },

    async generate(request: GenerateRequest): Promise<GenerateResult> {
      const start = performance.now();
      const payload = config.transformRequest ? config.transformRequest(request) : request;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Generic HTTP model endpoint error (${response.status}): ${errText}`);
        }

        const data: unknown = await response.json();

        if (config.transformResponse) {
          return config.transformResponse(data);
        }

        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        return {
          raw,
          parsed: typeof data === 'object' ? data : undefined,
          usage: {
            inputTokens: Math.ceil(request.input.length / 4),
            outputTokens: Math.ceil(raw.length / 4),
          },
          latencyMs: performance.now() - start,
          finishReason: 'stop',
        };
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    },
  };
}
