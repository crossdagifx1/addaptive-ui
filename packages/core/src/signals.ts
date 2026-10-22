// ─── Signal Types ───────────────────────────────────────────────────────────

/** A normalized visitor signal event */
export interface Signal {
  /** Event type */
  type: 'click' | 'scroll' | 'dwell' | 'error' | 'form-submit' | 'rage-click' | 'custom';
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Pseudonymous session identifier */
  sessionId: string;
  /** Page identifier */
  pageId: string;
  /** Blueprint ID the visitor is seeing */
  blueprintId?: string;
  /** Non-identifying event properties */
  properties: Record<string, unknown>;
}

/** Configuration for signal collection */
export interface SignalConfig {
  /** Whether signal collection is enabled */
  enabled: boolean;
  /** Which signal types to collect */
  types: Signal['type'][];
  /** Maximum events to batch before sending */
  batchSize: number;
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  /** Respect consent state */
  requireConsent: boolean;
  /** Endpoint to send signals to */
  endpoint?: string;
}

/** Manages signal collection lifecycle */
export interface SignalCollector {
  /** Start collecting signals */
  start(): void;
  /** Stop collecting and flush remaining signals */
  stop(): Promise<void>;
  /** Manually track a custom event */
  track(type: Signal['type'], properties: Record<string, unknown>): void;
  /** Update consent state */
  setConsent(consented: boolean): void;
  /** Get queued events (useful for testing) */
  getQueue(): Signal[];
  /** Flush queued events */
  flush(): Promise<void>;
}

/**
 * Creates a signal collector instance.
 */
export function createSignalCollector(
  config: SignalConfig,
  context: { pageId: string; sessionId?: string; blueprintId?: string },
): SignalCollector {
  let consented = !config.requireConsent;
  let active = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const queue: Signal[] = [];

  const sessionId = context.sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`;

  const flush = async () => {
    if (queue.length === 0 || !config.endpoint) return;
    const batch = queue.splice(0, config.batchSize);

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
        });
      }
    } catch {
      // Degrade gracefully: re-queue up to batch size if failed
      queue.unshift(...batch.slice(0, 50));
    }
  };

  const track = (type: Signal['type'], properties: Record<string, unknown>) => {
    if (!config.enabled || !consented || !config.types.includes(type)) {
      return;
    }

    queue.push({
      type,
      timestamp: new Date().toISOString(),
      sessionId,
      pageId: context.pageId,
      blueprintId: context.blueprintId,
      properties,
    });

    if (queue.length >= config.batchSize) {
      void flush();
    }
  };

  return {
    start() {
      if (active || !config.enabled) return;
      active = true;

      if (config.flushIntervalMs > 0) {
        timer = setInterval(() => {
          void flush();
        }, config.flushIntervalMs);
      }
    },
    async stop() {
      if (!active) return;
      active = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      await flush();
    },
    track,
    setConsent(userConsented: boolean) {
      consented = userConsented;
      if (!consented) {
        queue.length = 0;
      }
    },
    getQueue() {
      return [...queue];
    },
    flush,
  };
}
