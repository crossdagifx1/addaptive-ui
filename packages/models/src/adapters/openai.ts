import type { ModelAdapter } from '../adapter.js';
import type { GenerateRequest, GenerateResult, CostEstimate } from '../types.js';

export interface OpenAIAdapterConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  organizationId?: string;
}

/**
 * OpenAI-compatible model adapter.
 * Works with OpenAI (gpt-4o, gpt-4o-mini), Groq, Together, Mistral, Ollama, and any OpenAI-compatible API.
 */
export function createOpenAIAdapter(config: OpenAIAdapterConfig): ModelAdapter {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');

  return {
    id: `openai:${config.model}`,

    capabilities: {
      structuredOutput: 'native',
      maxContextTokens: config.model.includes('mini') ? 128000 : 128000,
      supportsStreaming: false,
      supportsImages: true,
      metadata: { provider: 'openai', model: config.model },
    },

    estimateCost(request: GenerateRequest): CostEstimate {
      // Rough heuristic: 4 chars per token
      const inputTokens = Math.ceil((request.system.length + request.input.length) / 4);
      const outputTokens = request.maxOutputTokens || 1500;
      // Rates: ~$2.50 / 1M input, $10.00 / 1M output for gpt-4o; much lower for mini
      const isMini = config.model.includes('mini');
      const inputRate = isMini ? 0.00000015 : 0.0000025;
      const outputRate = isMini ? 0.0000006 : 0.00001;

      const estimatedCostUsd = inputTokens * inputRate + outputTokens * outputRate;
      return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd,
        estimatedLatencyMs: 1200,
      };
    },

    async generate(request: GenerateRequest): Promise<GenerateResult> {
      const start = performance.now();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };

      if (config.organizationId) {
        headers['OpenAI-Organization'] = config.organizationId;
      }

      const body: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.input },
        ],
        temperature: request.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      };

      if (request.maxOutputTokens) {
        body['max_tokens'] = request.maxOutputTokens;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as {
          choices: Array<{ message: { content: string }; finish_reason?: string }>;
          usage?: { prompt_tokens: number; completion_tokens: number };
        };

        const raw = data.choices[0]?.message?.content || '{}';
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
            inputTokens: data.usage?.prompt_tokens || Math.ceil(request.input.length / 4),
            outputTokens: data.usage?.completion_tokens || Math.ceil(raw.length / 4),
          },
          latencyMs: performance.now() - start,
          finishReason: (data.choices[0]?.finish_reason as GenerateResult['finishReason']) || 'stop',
        };
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
