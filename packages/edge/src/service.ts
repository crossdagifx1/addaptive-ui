import type { Blueprint } from '@aui/schema';
import { assignTrafficGroup } from '@aui/analytics';
import type { EdgeConfig, VariantLookupResult } from './types.js';

/** Common search engine bot user agent substrings */
const CRAWLER_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'slurp',
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
];

/**
 * Checks if a user agent string belongs to a search engine crawler or bot.
 */
export function isCrawler(userAgent?: string): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((bot) => lower.includes(bot));
}

export interface EdgeLookupRequest {
  siteId: string;
  pageId: string;
  segmentKey: string;
  userAgent?: string;
  sessionId?: string;
  rolloutPercent?: number;
  holdoutPercent?: number;
}

export interface EdgeVariantService {
  /** Look up an approved blueprint variant for a visitor with holdout support */
  lookup(request: EdgeLookupRequest): Promise<VariantLookupResult>;

  /** Cache an approved blueprint for a segment */
  cache(
    siteId: string,
    pageId: string,
    segmentKey: string,
    blueprint: Blueprint,
    ttlSeconds?: number,
  ): void;

  /** Clear a cached variant (for rollback or invalidation) */
  invalidate(siteId: string, pageId: string, segmentKey?: string): void;

  /** Render static SSR HTML from a blueprint */
  renderSsrHtml(blueprint: Blueprint): string;
}

/**
 * Creates an edge variant lookup and SSR rendering service.
 */
export function createEdgeVariantService(
  config: EdgeConfig,
  defaultBlueprint: Blueprint,
): EdgeVariantService {
  const cacheMap = new Map<string, { blueprint: Blueprint; expiresAt: number }>();

  const getCacheKey = (siteId: string, pageId: string, segmentKey: string) =>
    `${siteId}::${pageId}::${segmentKey}`;

  return {
    async lookup(request) {
      // 1. Crawler Safety: always serve stable canonical version to crawlers (avoid cloaking)
      if (isCrawler(request.userAgent)) {
        return {
          hit: true,
          blueprint: defaultBlueprint,
          segmentKey: config.canonicalSegment || 'default',
          isDefault: true,
          group: 'holdout',
        };
      }

      // 2. Cache lookup
      const key = getCacheKey(request.siteId, request.pageId, request.segmentKey);
      const cached = cacheMap.get(key);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        // 3. Traffic Splitting / Holdout Assignment
        let group: 'holdout' | 'variant' = 'variant';
        if (request.sessionId) {
          group = assignTrafficGroup({
            sessionId: request.sessionId,
            experimentId: key,
            rolloutPercent: request.rolloutPercent ?? 100,
            holdoutPercent: request.holdoutPercent ?? (config.defaultHoldoutPercent ?? 10),
          });
        }

        if (group === 'holdout') {
          return {
            hit: true,
            blueprint: defaultBlueprint,
            segmentKey: request.segmentKey,
            isDefault: true,
            group: 'holdout',
            ttlSeconds: Math.ceil((cached.expiresAt - now) / 1000),
          };
        }

        return {
          hit: true,
          blueprint: cached.blueprint,
          segmentKey: request.segmentKey,
          isDefault: false,
          group: 'variant',
          ttlSeconds: Math.ceil((cached.expiresAt - now) / 1000),
        };
      }

      // 4. Cache Miss: return default blueprint immediately (never block first paint)
      return {
        hit: false,
        blueprint: defaultBlueprint,
        segmentKey: request.segmentKey,
        isDefault: true,
        group: 'holdout',
      };
    },

    cache(siteId, pageId, segmentKey, blueprint, ttlSeconds = 86400) {
      const key = getCacheKey(siteId, pageId, segmentKey);
      cacheMap.set(key, {
        blueprint,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    },

    invalidate(siteId, pageId, segmentKey) {
      if (segmentKey) {
        cacheMap.delete(getCacheKey(siteId, pageId, segmentKey));
      } else {
        const prefix = `${siteId}::${pageId}::`;
        for (const k of cacheMap.keys()) {
          if (k.startsWith(prefix)) cacheMap.delete(k);
        }
      }
    },

    renderSsrHtml(blueprint) {
      const sectionHtmls = blueprint.layout.sections.map((sectionName) => {
        const comp = blueprint.components[sectionName];
        if (!comp) return '';
        const propsJson = JSON.stringify(comp.props || {});
        return `
          <section data-aui-section="${sectionName}" data-aui-type="${comp.type}" ${comp.locked ? 'data-aui-locked="true"' : ''}>
            <script type="application/json" class="aui-props">${propsJson}</script>
          </section>
        `;
      });

      return `
        <div id="aui-root" data-aui-rendered="ssr" data-aui-blueprint-id="${blueprint.blueprintId}">
          ${sectionHtmls.join('\n')}
        </div>
      `;
    },
  };
}
