import type { Blueprint } from '@aui/schema';
import type { TrafficGroup } from '@aui/analytics';

/** Edge/SSR renderer configuration */
export interface EdgeConfig {
  /** Cache backend */
  cacheBackend: 'memory' | 'redis' | 'kv';
  /** Canonical blueprint for crawlers */
  canonicalSegment?: string;
  /** Whether to support streaming HTML */
  streamingHtml: boolean;
  /** Default holdout percentage for experiments (e.g. 10 = 10%) */
  defaultHoldoutPercent?: number;
}

/** Result of looking up a variant at the edge */
export interface VariantLookupResult {
  /** Whether a cached variant was found */
  hit: boolean;
  /** The blueprint to render */
  blueprint: Blueprint;
  /** The segment key used for lookup */
  segmentKey: string;
  /** Whether this is the default/canonical */
  isDefault: boolean;
  /** Experimentation traffic group */
  group?: TrafficGroup;
  /** Cache TTL remaining in seconds */
  ttlSeconds?: number;
}
