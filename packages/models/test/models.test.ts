import { describe, it, expect, vi } from 'vitest';
import {
  createModelRouter,
  createOpenAIAdapter,
  createAnthropicAdapter,
  createGoogleAdapter,
  type ModelAdapter,
} from '../src/index.js';

describe('@aui/models', () => {
  it('estimates costs for OpenAI, Anthropic, and Google adapters', () => {
    const openai = createOpenAIAdapter({ apiKey: 'sk-fake', model: 'gpt-4o' });
    const anthropic = createAnthropicAdapter({ apiKey: 'ant-fake', model: 'claude-3-5-sonnet-20241022' });
    const google = createGoogleAdapter({ apiKey: 'gem-fake', model: 'gemini-1.5-flash' });

    const req = {
      system: 'You are an adaptive UI generator.',
      input: 'Visitor came from Google ad about speed.',
      outputSchema: {},
      timeoutMs: 5000,
    };

    const estOpenAI = openai.estimateCost(req);
    expect(estOpenAI.estimatedInputTokens).toBeGreaterThan(0);
    expect(estOpenAI.estimatedCostUsd).toBeGreaterThan(0);

    const estAnthropic = anthropic.estimateCost(req);
    expect(estAnthropic.estimatedInputTokens).toBeGreaterThan(0);

    const estGoogle = google.estimateCost(req);
    expect(estGoogle.estimatedInputTokens).toBeGreaterThan(0);
  });

  describe('ModelRouter', () => {
    const mockAdapter1: ModelAdapter = {
      id: 'mock-fast',
      capabilities: {
        structuredOutput: 'native',
        maxContextTokens: 32000,
        supportsStreaming: false,
        supportsImages: false,
      },
      estimateCost: () => ({ estimatedInputTokens: 10, estimatedOutputTokens: 10, estimatedCostUsd: 0.001, estimatedLatencyMs: 200 }),
      generate: vi.fn().mockResolvedValue({
        raw: '{"headline": "Fast"}',
        parsed: { headline: 'Fast' },
        usage: { inputTokens: 10, outputTokens: 10 },
        latencyMs: 150,
      }),
    };

    const mockAdapter2: ModelAdapter = {
      id: 'mock-quality',
      capabilities: {
        structuredOutput: 'native',
        maxContextTokens: 128000,
        supportsStreaming: false,
        supportsImages: true,
      },
      estimateCost: () => ({ estimatedInputTokens: 10, estimatedOutputTokens: 10, estimatedCostUsd: 0.01, estimatedLatencyMs: 1000 }),
      generate: vi.fn().mockResolvedValue({
        raw: '{"headline": "Quality"}',
        parsed: { headline: 'Quality' },
        usage: { inputTokens: 10, outputTokens: 10 },
        latencyMs: 900,
      }),
    };

    it('routes requests based on priority and conditions', () => {
      const router = createModelRouter({
        routes: [
          {
            id: 'route-enterprise',
            adapterId: 'mock-quality',
            priority: 10,
            enabled: true,
            conditions: { taskTypes: ['enterprise-landing'] },
          },
          {
            id: 'route-default',
            adapterId: 'mock-fast',
            priority: 1,
            enabled: true,
          },
        ],
        fallbackAdapterId: 'mock-fast',
        maxRepairRetries: 2,
        enableABRouting: false,
      });

      router.registerAdapter(mockAdapter1);
      router.registerAdapter(mockAdapter2);

      const standardAdapter = router.selectAdapter({ taskType: 'standard' });
      expect(standardAdapter.id).toBe('mock-fast');

      const enterpriseAdapter = router.selectAdapter({ taskType: 'enterprise-landing' });
      expect(enterpriseAdapter.id).toBe('mock-quality');
    });

    it('falls back to secondary adapter if primary fails', async () => {
      const failingPrimary: ModelAdapter = {
        ...mockAdapter1,
        id: 'mock-failing',
        generate: vi.fn().mockRejectedValue(new Error('Rate limit exceeded 429')),
      };

      const router = createModelRouter({
        routes: [
          {
            id: 'route-primary',
            adapterId: 'mock-failing',
            priority: 10,
            enabled: true,
          },
        ],
        fallbackAdapterId: 'mock-quality',
        maxRepairRetries: 1,
        enableABRouting: false,
      });

      router.registerAdapter(failingPrimary);
      router.registerAdapter(mockAdapter2);

      const res = await router.generateWithFallback({
        system: '',
        input: '',
        outputSchema: {},
        timeoutMs: 5000,
      });

      expect(res.parsed).toEqual({ headline: 'Quality' });
    });
  });
});
