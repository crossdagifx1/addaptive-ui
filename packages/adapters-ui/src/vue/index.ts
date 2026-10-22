import type { Blueprint } from '@aui/schema';
import { createAUIClient, type AUIClient, type AUIClientConfig, mapComponentProps, type PropTransformRule } from '@aui/core';

export interface VueAUIInstance {
  client: AUIClient;
  getCurrentBlueprint(): Blueprint | undefined;
  applyBlueprint(bp: Blueprint): Promise<void>;
  reset(): Promise<void>;
  mapZone(zoneName: string, mapping?: Record<string, string | PropTransformRule>): Record<string, any> | null;
}

/**
 * Creates a framework-native Vue 3 adapter instance.
 */
export function createVueAUI(config: AUIClientConfig): VueAUIInstance {
  const client = createAUIClient(config);
  let activeBlueprint = config.defaultBlueprint;

  return {
    client,
    getCurrentBlueprint: () => activeBlueprint,
    async applyBlueprint(bp: Blueprint) {
      activeBlueprint = bp;
      await client.applyBlueprint(bp);
    },
    async reset() {
      activeBlueprint = config.defaultBlueprint;
      await client.reset();
    },
    mapZone(zoneName: string, mapping?: Record<string, string | PropTransformRule>) {
      if (!activeBlueprint) return null;
      const comp = activeBlueprint.components[zoneName];
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

/**
 * Vue 3 Plugin definition for `app.use(AUIPlugin, config)`
 */
export const AUIPlugin = {
  install(app: any, config: AUIClientConfig) {
    const aui = createVueAUI(config);
    app.config.globalProperties.$aui = aui;
    app.provide('aui', aui);
  },
};
