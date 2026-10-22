/**
 * Rule for transforming a single prop from Blueprint data to customer component props.
 */
export interface PropTransformRule {
  /** Target prop name on the customer's component (e.g. "title", "subTitle") */
  targetProp: string;
  /** Source prop path in the blueprint component props (dot-notated, e.g. "headline", "primaryCta.label") */
  sourcePath?: string;
  /** Fallback value if source property is missing or undefined */
  defaultValue?: unknown;
  /** Custom transformation function */
  transform?: (value: any, allBlueprintProps: Record<string, unknown>) => any;
}

/**
 * Configuration mapping a Blueprint component type to a customer-owned component.
 */
export interface ComponentMappingConfig {
  /** The blueprint component type (e.g. "hero" | "HeroSection" | "PricingTable") */
  blueprintType: string;
  /** Customer's custom component name (e.g. "CorporateHero", "MyPricing") */
  targetComponent: string;
  /** Whether this component is a strict locked zone */
  isLocked?: boolean;
  /** Prop mappings: either string path (e.g. { title: "headline" }) or PropTransformRule */
  propMappings: Record<string, string | PropTransformRule>;
  /** Default props to inject into the customer component */
  defaultProps?: Record<string, unknown>;
}

/**
 * Safe deep path extractor supporting dot notation (e.g. "primaryCta.label", "items.0.title").
 */
export function getByPath(obj: any, pathStr: string): any {
  if (obj === null || obj === undefined || !pathStr) return undefined;
  const parts = pathStr.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Transforms blueprint component props into customer component props using a mapping config.
 */
export function mapComponentProps(
  blueprintProps: Record<string, unknown>,
  config: ComponentMappingConfig
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(config.defaultProps || {}) };

  for (const [targetKey, rule] of Object.entries(config.propMappings)) {
    if (typeof rule === 'string') {
      const val = getByPath(blueprintProps, rule);
      result[targetKey] = val !== undefined ? val : blueprintProps[targetKey];
    } else {
      const sourcePath = rule.sourcePath || rule.targetProp;
      let rawVal = getByPath(blueprintProps, sourcePath);
      if (rawVal === undefined && rule.defaultValue !== undefined) {
        rawVal = rule.defaultValue;
      }
      if (rule.transform) {
        result[targetKey] = rule.transform(rawVal, blueprintProps);
      } else {
        result[targetKey] = rawVal;
      }
    }
  }

  return result;
}

/**
 * Component Mapper Engine — manages customer component mappings across the application.
 */
export class ComponentMapper {
  private mappings = new Map<string, ComponentMappingConfig>();

  /**
   * Register a component mapping configuration.
   */
  register(config: ComponentMappingConfig): void {
    this.mappings.set(config.blueprintType.toLowerCase(), config);
    // Also index by target component name
    this.mappings.set(config.targetComponent.toLowerCase(), config);
  }

  /**
   * Check if a mapping exists for a blueprint type or component name.
   */
  has(blueprintTypeOrName: string): boolean {
    return this.mappings.has(blueprintTypeOrName.toLowerCase());
  }

  /**
   * Get the mapping configuration.
   */
  get(blueprintTypeOrName: string): ComponentMappingConfig | undefined {
    return this.mappings.get(blueprintTypeOrName.toLowerCase());
  }

  /**
   * Map blueprint props to customer component props.
   * If no mapping exists, returns the original props.
   */
  mapProps(blueprintType: string, blueprintProps: Record<string, unknown>): Record<string, unknown> {
    const config = this.get(blueprintType);
    if (!config) return { ...blueprintProps };
    return mapComponentProps(blueprintProps, config);
  }

  /**
   * List all registered blueprint types.
   */
  list(): string[] {
    return Array.from(new Set(Array.from(this.mappings.values()).map((c) => c.blueprintType)));
  }

  /**
   * Clear all mappings.
   */
  clear(): void {
    this.mappings.clear();
  }
}

export function createComponentMapper(): ComponentMapper {
  return new ComponentMapper();
}
