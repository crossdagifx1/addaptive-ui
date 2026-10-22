import { z } from 'zod';

// ─── Component Props ────────────────────────────────────────────────────────

/** Generic component props — each component type defines its own shape */
export type ComponentProps = Record<string, unknown>;

// ─── Component Slot ─────────────────────────────────────────────────────────

/** A named child area within a component */
export interface ComponentSlot {
  /** Slot name */
  name: string;
  /** Whether the slot is required */
  required: boolean;
  /** Allowed component types in this slot */
  allowedTypes?: string[];
}

// ─── Component Definition (within a blueprint) ─────────────────────────────

/**
 * A component instance as it appears inside a blueprint.
 * Each entry maps a section name to a component type + props.
 */
export interface ComponentDefinition {
  /** The registered component type name */
  type: string;
  /** Component props matching the registered propsSchema */
  props?: ComponentProps;
  /** Whether this component is locked (AI cannot modify) */
  locked?: boolean;
  /** Reference to a named default variant instead of inline props */
  ref?: string;
  /** Named visual variant */
  variant?: string;
  /** Child components in named slots */
  slots?: Record<string, ComponentDefinition | ComponentDefinition[]>;
}

export const ComponentDefinitionSchema: z.ZodType<ComponentDefinition> = z.object({
  type: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  locked: z.boolean().optional(),
  ref: z.string().optional(),
  variant: z.string().optional(),
  slots: z.record(z.string(), z.lazy(() =>
    z.union([ComponentDefinitionSchema, z.array(ComponentDefinitionSchema)])
  )).optional(),
});
