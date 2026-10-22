import type { Blueprint } from '@aui/schema';

// ─── Fallback Manager ───────────────────────────────────────────────────────

/**
 * Manages fallback behavior: if anything fails, render the default page instantly.
 *
 * Design principle: "Always degrade gracefully."
 */
export interface FallbackManager {
  /** Set the default (fallback) blueprint */
  setDefault(blueprint: Blueprint): void;
  /** Get the current default blueprint */
  getDefault(): Blueprint | undefined;
  /** Trigger fallback to default with a reason */
  fallback(reason: string): Blueprint | undefined;
  /** Check if currently showing fallback */
  isFallback(): boolean;
  /** Reset fallback state */
  clearFallback(): void;
  /** Get the last fallback reason */
  getLastReason(): string | undefined;
}

/**
 * Creates a new FallbackManager instance.
 */
export function createFallbackManager(initialDefault?: Blueprint): FallbackManager {
  let defaultBlueprint: Blueprint | undefined = initialDefault;
  let inFallbackMode = false;
  let lastReason: string | undefined;

  return {
    setDefault(blueprint: Blueprint) {
      defaultBlueprint = blueprint;
    },
    getDefault() {
      return defaultBlueprint;
    },
    fallback(reason: string) {
      inFallbackMode = true;
      lastReason = reason;
      return defaultBlueprint;
    },
    isFallback() {
      return inFallbackMode;
    },
    clearFallback() {
      inFallbackMode = false;
      lastReason = undefined;
    },
    getLastReason() {
      return lastReason;
    },
  };
}
