import type { ModelAdapter } from '../adapter.js';
import type { GenerateRequest, GenerateResult, CostEstimate } from '../types.js';

export interface GoogleAdapterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Google Gemini model adapter (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0).
 */
export function createGoogleAdapter(config: GoogleAdapterConfig): ModelAdapter {
  const model = config.model || 'gemini-1.5-flash';
  const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

  return {
    id: `google:${model}`,

    capabilities: {
      structuredOutput: 'native',
      maxContextTokens: 1000000,
      supportsStreaming: false,
      supportsImages: true,
      metadata: { provider: 'google', model },
    },

    estimateCost(request: GenerateRequest): CostEstimate {
      const inputTokens = Math.ceil((request.system.length + request.input.length) / 4);
      const outputTokens = request.maxOutputTokens || 1500;
      const isFlash = model.includes('flash');
      const inputRate = isFlash ? 0.000000075 : 0.00000125;
      const outputRate = isFlash ? 0.0000003 : 0.000005;

      return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: inputTokens * inputRate + outputTokens * outputRate,
        estimatedLatencyMs: 900,
      };
    },

    async generate(request: GenerateRequest): Promise<GenerateResult> {
      const start = performance.now();
      const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

      const body: Record<string, unknown> = {
        systemInstruction: {
          parts: [{ text: request.system }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: request.input }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxOutputTokens || 2048,
        },
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Google Gemini API error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
          };
        };

        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = undefined;
        }

        return {
          raw,
          parsed,
          usage: {
            inputTokens: data.usageMetadata?.promptTokenCount || Math.ceil(request.input.length / 4),
            outputTokens: data.usageMetadata?.candidatesTokenCount || Math.ceil(raw.length / 4),
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
