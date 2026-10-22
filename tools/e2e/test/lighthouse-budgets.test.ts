// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createEdgeVariantService, type EdgeVariantService } from '@aui/edge';
import { defaultLandingBlueprint } from '@aui/components-landing';
import { applyTokens } from '@aui/core';
import type { Blueprint } from '@aui/schema';

describe('@aui/e2e > Lighthouse & Performance Budgets in CI', () => {
  it('enforces edge variant lookup budget: added TTFB < 20ms across 100 lookups', async () => {
    const prewarmedBp: Blueprint = {
      ...defaultLandingBlueprint,
      blueprintId: 'bp_prewarmed_mobile',
      segment: 'device:mobile|ref:google-ads',
    };

    const service: EdgeVariantService = createEdgeVariantService(
      {
        cacheBackend: 'memory',
        streamingHtml: false,
        defaultHoldoutPercent: 0,
      },
      defaultLandingBlueprint
    );

    // Warm up edge cache
    service.cache('site_test', 'landing', 'device:mobile|ref:google-ads', prewarmedBp);

    const latencies: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const result = await service.lookup({
        siteId: 'site_test',
        pageId: 'landing',
        segmentKey: 'device:mobile|ref:google-ads',
        sessionId: `visitor_${i}`,
        rolloutPercent: 100,
        holdoutPercent: 0,
      });
      const duration = performance.now() - start;
      latencies.push(duration);
      expect(result.blueprint.blueprintId).toBe('bp_prewarmed_mobile');
      expect(result.hit).toBe(true);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    // Budget target from plan.md Section 11.2: Added time to first byte under 20 ms
    expect(avgLatency).toBeLessThan(20);
  });

  it('enforces CLS = 0: token updates apply via CSS variables without DOM replacement', () => {
    const root = document.createElement('div');
    root.id = 'aui-test-root';
    document.body.appendChild(root);

    // Initial tokens
    applyTokens({ 'color.primary': '#00E5FF', density: 'comfortable' }, root);
    const initialChildCount = root.childNodes.length;

    expect(root.style.getPropertyValue('--aui-color-primary')).toBe('#00E5FF');
    expect(root.style.getPropertyValue('--aui-density-gap')).toBe('16px');

    // Update tokens for returning visitor variant
    applyTokens({ 'color.primary': '#D4AF37', density: 'compact' }, root);

    // CSS variables updated instantaneously with zero DOM manipulation/shift
    expect(root.style.getPropertyValue('--aui-color-primary')).toBe('#D4AF37');
    expect(root.style.getPropertyValue('--aui-density-gap')).toBe('8px');
    expect(root.childNodes.length).toBe(initialChildCount);
  });

  it('enforces critical path rule: cold segment miss immediately returns default blueprint', async () => {
    const service = createEdgeVariantService(
      {
        cacheBackend: 'memory',
        streamingHtml: false,
      },
      defaultLandingBlueprint
    );

    const start = performance.now();
    const result = await service.lookup({
      siteId: 'site_test',
      pageId: 'landing',
      segmentKey: 'unseen-segment',
      sessionId: 'visitor_cold_1',
    });
    const elapsed = performance.now() - start;

    // Cache miss returns default immediately (sub-15ms) without waiting for background model call
    expect(elapsed).toBeLessThan(15);
    expect(result.blueprint.blueprintId).toBe(defaultLandingBlueprint.blueprintId);
    expect(result.hit).toBe(false);
    expect(result.isDefault).toBe(true);
  });
});
