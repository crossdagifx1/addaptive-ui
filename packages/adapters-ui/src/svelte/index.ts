import type { Blueprint } from '@aui/schema';
import { createAUIClient, type AUIClient, type AUIClientConfig, mapComponentProps, type PropTransformRule } from '@aui/core';

export interface SvelteAUIStore {
  subscribe(fn: (value: { blueprint?: Blueprint; status: 'ready' | 'adapting' | 'fallback' }) => void): () => void;
  applyBlueprint(bp: Blueprint): Promise<void>;
  reset(): Promise<void>;
  getZoneProps(zoneName: string, mapping?: Record<string, string | PropTransformRule>): Record<string, any> | null;
  client: AUIClient;
}

/**
 * Creates a Svelte readable store compatible with Svelte 4 and Svelte 5 runes/auto-subscriptions.
 */
export function createAUIStore(config: AUIClientConfig): SvelteAUIStore {
  const client = createAUIClient(config);
  let state: { blueprint?: Blueprint; status: 'ready' | 'adapting' | 'fallback' } = {
    blueprint: config.defaultBlueprint,
    status: 'ready',
  };

  const subscribers = new Set<(val: typeof state) => void>();

  function notify() {
    subscribers.forEach((fn) => fn(state));
  }

  return {
    client,
    subscribe(fn) {
      subscribers.add(fn);
      fn(state);
      return () => subscribers.delete(fn);
    },
    async applyBlueprint(bp: Blueprint) {
      state = { blueprint: bp, status: 'adapting' };
      notify();
      const res = await client.applyBlueprint(bp);
      state = { blueprint: res.blueprintUsed, status: res.fellBack ? 'fallback' : 'ready' };
      notify();
    },
    async reset() {
      state = { blueprint: config.defaultBlueprint, status: 'ready' };
      notify();
      await client.reset();
    },
    getZoneProps(zoneName: string, mapping?: Record<string, string | PropTransformRule>) {
      if (!state.blueprint) return null;
      const comp = state.blueprint.components[zoneName];
      if (!comp) return null;

      const rawProps: Record<string, unknown> = {
        ...comp.props,
        variant: comp.variant,
        locked: comp.locked,
      };

      if (!mapping) return rawProps;
      return mapComponentProps(rawProps, {
        blueprintType: comp.type,
        targetComponent: zoneName,
        propMappings: mapping,
      });
    },
  };
}
