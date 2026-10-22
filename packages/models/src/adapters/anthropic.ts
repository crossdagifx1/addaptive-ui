import type { ModelAdapter } from '../adapter.js';
import type { GenerateRequest, GenerateResult, CostEstimate } from '../types.js';

export interface AnthropicAdapterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Anthropic Claude adapter (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus).
 */
export function createAnthropicAdapter(config: AnthropicAdapterConfig): ModelAdapter {
  const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');

  return {
    id: `anthropic:${config.model}`,

    capabilities: {
      structuredOutput: 'prompted',
      maxContextTokens: 200000,
      supportsStreaming: false,
      supportsImages: true,
      metadata: { provider: 'anthropic', model: config.model },
    },

    estimateCost(request: GenerateRequest): CostEstimate {
      const inputTokens = Math.ceil((request.system.length + request.input.length) / 4);
      const outputTokens = request.maxOutputTokens || 1500;
      const isHaiku = config.model.includes('haiku');
      const inputRate = isHaiku ? 0.0000008 : 0.000003;
      const outputRate = isHaiku ? 0.000004 : 0.000015;

      return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: inputTokens * inputRate + outputTokens * outputRate,
        estimatedLatencyMs: 1500,
      };
    },

    async generate(request: GenerateRequest): Promise<GenerateResult> {
      const start = performance.now();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      };

      const promptWithJsonReminder = `${request.input}\n\nIMPORTANT: Return ONLY a valid JSON object matching the requested schema. Do not include markdown codeblocks or explanatory commentary.`;

      const body: Record<string, unknown> = {
        model: config.model,
        system: request.system,
        messages: [{ role: 'user', content: promptWithJsonReminder }],
        max_tokens: request.maxOutputTokens || 2048,
        temperature: request.temperature ?? 0.2,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic API error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as {
          content: Array<{ type: string; text?: string }>;
          usage?: { input_tokens: number; output_tokens: number };
          stop_reason?: string;
        };

        const raw = data.content?.[0]?.text || '{}';
        // Extract JSON if wrapped in codeblock
        let cleanJson = raw.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(cleanJson);
        } catch {
          parsed = undefined;
        }

        return {
          raw,
          parsed,
          usage: {
            inputTokens: data.usage?.input_tokens || Math.ceil(request.input.length / 4),
            outputTokens: data.usage?.output_tokens || Math.ceil(raw.length / 4),
          },
          latencyMs: performance.now() - start,
          finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'error',
        };
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    },
  };
}
