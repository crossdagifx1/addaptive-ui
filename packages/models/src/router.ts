import type { ModelAdapter } from './adapter.js';
import type { GenerateRequest, GenerateResult } from './types.js';

// ─── Model Route ────────────────────────────────────────────────────────────

/** A routing rule that maps conditions to a model adapter */
export interface ModelRoute {
  /** Route identifier */
  id: string;
  /** Which adapter to use */
  adapterId: string;
  /** Priority (higher = preferred) */
  priority: number;
  /** Conditions for this route */
  conditions?: {
    /** Task types this route handles */
    taskTypes?: string[];
    /** Maximum cost in USD per request */
    maxCostUsd?: number;
    /** Maximum latency in milliseconds */
    maxLatencyMs?: number;
    /** Only for specific customers */
    customerIds?: string[];
  };
  /** Weight for A/B routing (0-100) */
  weight?: number;
  /** Whether this route is currently enabled */
  enabled: boolean;
}

// ─── Model Router Config ────────────────────────────────────────────────────

/** Configuration for the model router */
export interface ModelRouterConfig {
  /** Ordered list of routes (evaluated in priority order) */
  routes: ModelRoute[];
  /** Fallback adapter ID if no route matches */
  fallbackAdapterId: string;
  /** Global cost ceiling per request in USD */
  globalMaxCostUsd?: number;
  /** Global latency budget per request in ms */
  globalMaxLatencyMs?: number;
  /** Maximum repair retries before falling back */
  maxRepairRetries: number;
  /** Enable A/B routing between models */
  enableABRouting: boolean;
}

/** Model Router instance */
export interface ModelRouter {
  registerAdapter(adapter: ModelAdapter): void;
  getAdapter(id: string): ModelAdapter | undefined;
  listAdapters(): string[];
  selectAdapter(context?: { taskType?: string; maxCostUsd?: number; customerId?: string }): ModelAdapter;
  generateWithFallback(
    request: GenerateRequest,
    context?: { taskType?: string; maxCostUsd?: number; customerId?: string },
  ): Promise<GenerateResult>;
}

/**
 * Creates a ModelRouter instance.
 */
export function createModelRouter(config: ModelRouterConfig): ModelRouter {
  const adapters = new Map<string, ModelAdapter>();

  return {
    registerAdapter(adapter: ModelAdapter) {
      adapters.set(adapter.id, adapter);
    },

    getAdapter(id: string) {
      return adapters.get(id);
    },

    listAdapters() {
      return Array.from(adapters.keys());
    },

    selectAdapter(context) {
      const enabledRoutes = config.routes
        .filter((r) => r.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const route of enabledRoutes) {
        const adapter = adapters.get(route.adapterId);
        if (!adapter) continue;

        // Check task type match
        if (
          route.conditions?.taskTypes &&
          context?.taskType &&
          !route.conditions.taskTypes.includes(context.taskType)
        ) {
          continue;
        }

        // Check customer match
        if (
          route.conditions?.customerIds &&
          context?.customerId &&
          !route.conditions.customerIds.includes(context.customerId)
        ) {
          continue;
        }

        // Check cost ceiling
        if (route.conditions?.maxCostUsd && context?.maxCostUsd) {
          if (route.conditions.maxCostUsd > context.maxCostUsd) {
            continue;
          }
        }

        return adapter;
      }

      // Return configured fallback adapter
      const fallback = adapters.get(config.fallbackAdapterId);
      if (fallback) return fallback;

      // Otherwise return first available adapter or throw
      const first = adapters.values().next().value;
      if (first) return first;

      throw new Error(`ModelRouter: No adapter found for route (fallback: ${config.fallbackAdapterId})`);
    },

    async generateWithFallback(request, context) {
      const primary = this.selectAdapter(context);
      try {
        return await primary.generate(request);
      } catch (primaryErr) {
        // Fallback chain
        const fallback = adapters.get(config.fallbackAdapterId);
        if (fallback && fallback.id !== primary.id) {
          try {
            return await fallback.generate(request);
          } catch (fallbackErr) {
            throw new Error(
              `ModelRouter: Both primary (${primary.id}) and fallback (${fallback.id}) failed. Primary: ${(primaryErr as Error).message}. Fallback: ${(fallbackErr as Error).message}`,
            );
          }
        }
        throw primaryErr;
      }
    },
  };
}
