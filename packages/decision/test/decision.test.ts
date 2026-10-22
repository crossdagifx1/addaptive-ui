import { describe, it, expect, vi } from 'vitest';
import type { Blueprint, ComponentRegistration } from '@aui/schema';
import type { Policy } from '@aui/policy';
import type { ModelAdapter, ModelRouter } from '@aui/models';
import {
  createContextBuilder,
  createPromptComposer,
  createDecisionPipeline,
  DEFAULT_PROMPT_TEMPLATE,
} from '../src/index.js';

describe('@aui/decision', () => {
  describe('ContextBuilder', () => {
    it('strips PII and creates normalized visitor context and segment key', () => {
      const builder = createContextBuilder();
      const context = builder.build({
        referrer: 'https://news.ycombinator.com/item?id=123',
        utm_source: 'hackernews',
        utm_campaign: 'launch',
        device: 'mobile',
        locale: 'en-US',
        returning: true,
      });

      expect(context.referrer).toBe('news.ycombinator.com');
      expect(context.campaign?.['source']).toBe('hackernews');
      expect(context.device).toBe('mobile');
      expect(context.returning).toBe(true);
      expect(context.segmentKey).toContain('ref:hackernews');
      expect(context.segmentKey).toContain('device:mobile');
    });
  });

  describe('PromptComposer', () => {
    it('composes system and input prompt from template and context', () => {
      const composer = createPromptComposer();
      const context = {
        referrer: 'google.com',
        device: 'desktop' as const,
        locale: 'en',
        returning: false,
        segmentKey: 'ref:google|device:desktop',
      };

      const result = composer.compose(
        DEFAULT_PROMPT_TEMPLATE,
        context,
        '- Hero: Hero component',
        '- Locked: PricingTable',
        '{"id": "default"}',
      );

      expect(result.system).toContain('AUI Decision Engine');
      expect(result.input).toContain('google.com');
      expect(result.input).toContain('Hero: Hero component');
      expect(result.input).toContain('PricingTable');
    });
  });

  describe('DecisionPipeline', () => {
    const sampleCatalog: ComponentRegistration[] = [
      {
        type: 'Hero',
        displayName: 'Hero',
        description: 'Hero block',
        propsSchema: {},
        permissions: { editable: ['headline'], readonly: [], reorderable: false, removable: false, variantChangeable: true },
        a11yRules: {},
        lockedByDefault: false,
      },
    ];

    const samplePolicy: Policy = {
      id: 'default',
      version: '1.0',
      locked: [],
      bannedPhrases: ['scam'],
      requiredElements: [],
      allowedActions: ['navigate'],
      maxSectionChanges: 5,
      a11y: { minContrast: 4.5, requireAltText: false },
      rules: [],
    };

    const defaultBp: Blueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp_def_1',
      pageId: 'landing',
      segment: 'default',
      layout: { type: 'stack', sections: ['hero'] },
      components: {
        hero: { type: 'Hero', props: { headline: 'Default Title' } },
      },
      meta: { generatedBy: 'default', createdAt: new Date().toISOString() },
    };

    it('generates, parses, and validates blueprint via model adapter', async () => {
      const validGeneratedBp: Blueprint = {
        schemaVersion: '1.0',
        blueprintId: 'bp_adapted_1',
        pageId: 'landing',
        segment: 'ref:google',
        layout: { type: 'stack', sections: ['hero'] },
        components: {
          hero: { type: 'Hero', props: { headline: 'Adapted for Search Traffic' } },
        },
        meta: { generatedBy: 'mock-model', reasoning: 'Optimized for search intent', createdAt: new Date().toISOString() },
      };

      const mockAdapter: ModelAdapter = {
        id: 'mock-gpt-4o',
        capabilities: { structuredOutput: 'native', maxContextTokens: 128000, supportsStreaming: false, supportsImages: false },
        estimateCost: () => ({ estimatedInputTokens: 50, estimatedOutputTokens: 50, estimatedCostUsd: 0.001, estimatedLatencyMs: 300 }),
        generate: vi.fn().mockResolvedValue({
          raw: JSON.stringify(validGeneratedBp),
          parsed: validGeneratedBp,
          usage: { inputTokens: 50, outputTokens: 50 },
          latencyMs: 250,
        }),
      };

      const mockRouter: ModelRouter = {
        registerAdapter: vi.fn(),
        getAdapter: () => mockAdapter,
        listAdapters: () => [mockAdapter.id],
        selectAdapter: () => mockAdapter,
        generateWithFallback: () => mockAdapter.generate({} as any),
      };

      const pipeline = createDecisionPipeline(
        {
          modelRouter: { routes: [], fallbackAdapterId: 'mock-gpt-4o', maxRepairRetries: 2, enableABRouting: false },
          approvalMode: 'auto-apply',
          maxRepairRetries: 2,
          generationMode: 'full-blueprint',
        },
        mockRouter,
      );

      const res = await pipeline.generateBlueprint({
        signals: { referrer: 'https://google.com', device: 'desktop' },
        defaultBlueprint: defaultBp,
        catalog: sampleCatalog,
        policy: samplePolicy,
        validatorConfig: {
          componentRegistry: sampleCatalog,
          lockedZones: [],
          contentPolicy: { bannedPhrases: [], requiredElements: [], allowedActions: ['navigate'] },
          accessibility: { minContrast: 4.5, requireAltText: false, requireHeadingOrder: false },
          sizeBudget: { maxSections: 10 },
          diffLimits: { maxSectionChanges: 5 },
        },
      });

      expect(res.blueprint).not.toBeNull();
      expect(res.blueprint?.components['hero']?.props?.['headline']).toBe('Adapted for Search Traffic');
      expect(res.repairAttempts).toBe(0);
      expect(res.needsApproval).toBe(false);
      expect(res.reasoning).toBe('Optimized for search intent');
    });
  });
});
