import { describe, it, expect } from 'vitest';
import type { Blueprint } from '@aui/schema';
import {
  createEdgeVariantService,
  isCrawler,
} from '../src/index.js';

describe('@aui/edge', () => {
  const defaultBp: Blueprint = {
    schemaVersion: '1.0',
    blueprintId: 'bp_edge_default',
    pageId: 'landing-1',
    segment: 'default',
    layout: { type: 'stack', sections: ['hero'] },
    components: {
      hero: { type: 'Hero', props: { headline: 'Canonical Headline' } },
    },
    meta: { generatedBy: 'default', createdAt: new Date().toISOString() },
  };

  it('detects search crawlers reliably to prevent cloaking', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Chrome/120.0 Mobile')).toBe(false);
  });

  it('always serves canonical default blueprint to search engine crawlers', async () => {
    const service = createEdgeVariantService(
      { cacheBackend: 'memory', streamingHtml: false, canonicalSegment: 'default' },
      defaultBp,
    );

    const res = await service.lookup({
      siteId: 'site_1',
      pageId: 'landing-1',
      segmentKey: 'ref:adwords|device:mobile',
      userAgent: 'Googlebot/2.1',
    });

    expect(res.hit).toBe(true);
    expect(res.isDefault).toBe(true);
    expect(res.blueprint.blueprintId).toBe('bp_edge_default');
  });

  it('handles cache miss and caching of adapted variants', async () => {
    const service = createEdgeVariantService(
      { cacheBackend: 'memory', streamingHtml: false },
      defaultBp,
    );

    // Initial lookup: cache miss -> returns default blueprint instantly
    const miss = await service.lookup({
      siteId: 'site_1',
      pageId: 'landing-1',
      segmentKey: 'ref:google-ads',
      userAgent: 'Mozilla/5.0 Chrome/120.0',
    });

    expect(miss.hit).toBe(false);
    expect(miss.isDefault).toBe(true);

    // Cache an approved adapted variant
    const adaptedBp: Blueprint = {
      ...defaultBp,
      blueprintId: 'bp_edge_adapted',
      segment: 'ref:google-ads',
      components: {
        hero: { type: 'Hero', props: { headline: 'High Speed Store' } },
      },
    };

    service.cache('site_1', 'landing-1', 'ref:google-ads', adaptedBp, 3600);

    // Second lookup: cache hit -> returns adapted variant
    const hit = await service.lookup({
      siteId: 'site_1',
      pageId: 'landing-1',
      segmentKey: 'ref:google-ads',
      userAgent: 'Mozilla/5.0 Chrome/120.0',
    });

    expect(hit.hit).toBe(true);
    expect(hit.isDefault).toBe(false);
    expect(hit.blueprint.blueprintId).toBe('bp_edge_adapted');
    expect(hit.ttlSeconds).toBeGreaterThan(0);
  });

  it('assigns holdout groups deterministically when sessionId is provided', async () => {
    const service = createEdgeVariantService(
      { cacheBackend: 'memory', streamingHtml: false, defaultHoldoutPercent: 20 },
      defaultBp,
    );

    const adaptedBp: Blueprint = {
      ...defaultBp,
      blueprintId: 'bp_edge_variant',
      segment: 'ref:google-ads',
      components: { hero: { type: 'Hero', props: { headline: 'Adapted Variant' } } },
    };
    service.cache('site_1', 'landing-1', 'ref:google-ads', adaptedBp, 3600);

    const res = await service.lookup({
      siteId: 'site_1',
      pageId: 'landing-1',
      segmentKey: 'ref:google-ads',
      sessionId: 'test_session_123',
    });

    expect(res.hit).toBe(true);
    expect(['holdout', 'variant']).toContain(res.group);
    if (res.group === 'holdout') {
      expect(res.isDefault).toBe(true);
    } else {
      expect(res.blueprint.blueprintId).toBe('bp_edge_variant');
    }
  });
});
