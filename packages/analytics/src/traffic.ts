import type { TrafficGroup } from './types.js';

/**
 * Fast deterministic string hash returning an integer between 0 and 99.
 * Uses 32-bit FNV-1a algorithm for uniform distribution without crypto overhead.
 */
export function hashToBucket(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
}

export interface TrafficSplitOptions {
  sessionId: string;
  experimentId: string;
  /** Percentage of traffic enrolled in the experiment (0-100). Default: 100 */
  rolloutPercent?: number;
  /** Percentage of enrolled traffic reserved as holdout control (0-100). Default: 10 */
  holdoutPercent?: number;
}

/**
 * Assigns a visitor session deterministically to 'holdout' or 'variant'.
 *
 * Examples:
 * - Standard experiment: rolloutPercent = 100, holdoutPercent = 10 (10% holdout, 90% variant)
 * - Canary deployment: rolloutPercent = 5, holdoutPercent = 0 (5% variant, 95% holdout)
 */
export function assignTrafficGroup(options: TrafficSplitOptions): TrafficGroup {
  const { sessionId, experimentId, rolloutPercent = 100, holdoutPercent = 10 } = options;

  const key = `${experimentId}:${sessionId}`;
  const bucket = hashToBucket(key);

  // If visitor is outside the rollout window, they receive holdout default
  if (bucket >= rolloutPercent) {
    return 'holdout';
  }

  // Within the rollout window, check holdout proportion
  const effectiveHoldoutBucket = Math.round((holdoutPercent / 100) * rolloutPercent);
  if (bucket < effectiveHoldoutBucket) {
    return 'holdout';
  }

  return 'variant';
}
