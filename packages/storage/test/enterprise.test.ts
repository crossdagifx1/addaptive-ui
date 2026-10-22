import { describe, it, expect } from 'vitest';
import {
  SpendGovernor,
  WebhookDispatcher,
  signWebhookPayload,
  GenerationTraceStore,
} from '../src/index.js';
import type { Blueprint } from '@aui/schema';

describe('@aui/storage > Enterprise Features', () => {
  describe('SpendGovernor & Alerts', () => {
    it('tracks spend, triggers 80% warning alert, and auto-pauses at 100%', () => {
      const governor = new SpendGovernor();
      governor.setMonthlyCap('site_prod', 100.0, 80);

      expect(governor.canGenerate('site_prod')).toBe(true);

      // Spend $50 (50%)
      const r1 = governor.recordSpend('site_prod', 50.0);
      expect(r1.percentUsed).toBe(50);
      expect(r1.warningTriggered).toBe(false);
      expect(r1.isAutoPaused).toBe(false);

      // Spend another $35 ($85 total -> 85%) -> warning triggered!
      const r2 = governor.recordSpend('site_prod', 35.0);
      expect(r2.percentUsed).toBe(85);
      expect(r2.warningTriggered).toBe(true);
      expect(r2.isAutoPaused).toBe(false);

      // Spend another $20 ($105 total -> >100%) -> auto-paused!
      const r3 = governor.recordSpend('site_prod', 20.0);
      expect(r3.capExceeded).toBe(true);
      expect(r3.isAutoPaused).toBe(true);
      expect(governor.canGenerate('site_prod')).toBe(false);

      // Reset restores generation capability
      governor.resetBudget('site_prod');
      expect(governor.canGenerate('site_prod')).toBe(true);
    });
  });

  describe('WebhookDispatcher & Signatures', () => {
    it('computes HMAC signature and dispatches matching events', async () => {
      const dispatcher = new WebhookDispatcher();
      const secret = 'whsec_secret_key_123';

      dispatcher.registerSubscription({
        id: 'sub_1',
        siteId: 'site_prod',
        url: 'https://example.com/aui-webhook',
        secret,
        events: ['blueprint.applied', 'guardrail.auto_paused'],
        active: true,
        createdAt: new Date().toISOString(),
      });

      const event = {
        id: 'evt_1',
        siteId: 'site_prod',
        type: 'guardrail.auto_paused' as const,
        timestamp: '1729584000',
        payload: { reason: 'Bounce rate degraded > 15%' },
      };

      const mockFetch = async () =>
        new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      const results = await dispatcher.dispatch(event, mockFetch as any);
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);
      expect(results[0].signature).toContain('v1=');

      // Verify signWebhookPayload output format
      const sig = signWebhookPayload(JSON.stringify(event), secret, event.timestamp);
      expect(sig.startsWith('t=1729584000,v1=')).toBe(true);
    });
  });

  describe('GenerationTraceStore & Replay', () => {
    it('persists AI generation traces and enables deterministic replay', () => {
      const store = new GenerationTraceStore();
      const mockBp: Blueprint = {
        schemaVersion: '1.0',
        blueprintId: 'bp_trace_01',
        pageId: 'landing',
        segment: 'ref:google-ads',
        layout: { type: 'stack', sections: ['hero', 'pricing'] },
        components: {
          hero: { type: 'Hero', props: { headline: 'Speed' } },
          pricing: { type: 'PricingTable', locked: true, props: { plan: 'Pro' } },
        },
        meta: { createdAt: new Date().toISOString() },
      };

      store.saveTrace({
        id: 'trace_101',
        siteId: 'site_prod',
        segmentKey: 'ref:google-ads',
        modelId: 'claude-3-7-sonnet',
        prompt: 'Adapt for speed search visitor',
        system: 'System prompt v2',
        rawOutput: JSON.stringify(mockBp),
        parsedBlueprint: mockBp,
        validationPassed: true,
        costUsd: 0.0045,
        latencyMs: 640,
        createdAt: new Date().toISOString(),
      });

      const trace = store.getTrace('trace_101');
      expect(trace).toBeDefined();
      expect(trace?.modelId).toBe('claude-3-7-sonnet');

      const replay = store.replayTrace('trace_101');
      expect(replay).not.toBeNull();
      expect(replay?.isIdentical).toBe(true);
      // Hero was editable, pricing was locked
      expect(replay?.diffSectionsChanged).toEqual(['hero']);
      expect(replay?.replayedValidationPassed).toBe(true);
    });
  });
});
