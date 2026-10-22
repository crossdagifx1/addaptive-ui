import { z } from 'zod';
import type { ComponentProps } from './component.js';

// ─── Component Permissions ──────────────────────────────────────────────────

/** Defines which props the AI is allowed to modify */
export interface ComponentPermissions {
  /** List of prop paths the AI may change (e.g., ["headline", "subheadline", "cta.label"]) */
  editable: string[];
  /** List of prop paths the AI may never change */
  readonly: string[];
  /** Whether the AI can reorder this component within the layout */
  reorderable: boolean;
  /** Whether the AI can remove this component entirely */
  removable: boolean;
  /** Whether the AI can change the visual variant */
  variantChangeable: boolean;
}

export const ComponentPermissionsSchema = z.object({
  editable: z.array(z.string()),
  readonly: z.array(z.string()),
  reorderable: z.boolean(),
  removable: z.boolean(),
  variantChangeable: z.boolean(),
});

// ─── Accessibility Rules ────────────────────────────────────────────────────

/** Accessibility requirements for a component */
export interface AccessibilityRules {
  /** Required ARIA labels */
  requiredLabels?: string[];
  /** Minimum contrast ratio */
  minContrast?: number;
  /** Required focus behavior */
  focusBehavior?: 'trap' | 'flow' | 'skip';
  /** Require alt text on images */
  requireAltText?: boolean;
  /** Required heading level */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Support prefers-reduced-motion */
  respectReducedMotion?: boolean;
}

export const AccessibilityRulesSchema = z.object({
  requiredLabels: z.array(z.string()).optional(),
  minContrast: z.number().positive().optional(),
  focusBehavior: z.enum(['trap', 'flow', 'skip']).optional(),
  requireAltText: z.boolean().optional(),
  headingLevel: z.union([
    z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]).optional(),
  respectReducedMotion: z.boolean().optional(),
});

// ─── Component Registration ─────────────────────────────────────────────────

/**
 * A registered component in the component catalog.
 * Every component the AI can use must be registered with its full contract.
 */
export interface ComponentRegistration {
  /** Unique component type name */
  type: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the component's purpose */
  description: string;
  /** JSON Schema for the component's props */
  propsSchema: Record<string, unknown>;
  /** Named child areas within the component */
  slots?: Array<{
    name: string;
    required: boolean;
    allowedTypes?: string[];
  }>;
  /** What the AI is allowed to change */
  permissions: ComponentPermissions;
  /** Accessibility requirements */
  a11yRules: AccessibilityRules;
  /** Available visual variants */
  variants?: string[];
  /** Whether locked by default (AI cannot touch without explicit unlock) */
  lockedByDefault: boolean;
  /** Default props for fallback rendering */
  defaultProps?: ComponentProps;
  /** Category for organization in the dashboard */
  category?: string;
}

export const ComponentRegistrationSchema = z.object({
  type: z.string(),
  displayName: z.string(),
  description: z.string(),
  propsSchema: z.record(z.string(), z.unknown()),
  slots: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    allowedTypes: z.array(z.string()).optional(),
  })).optional(),
  permissions: ComponentPermissionsSchema,
  a11yRules: AccessibilityRulesSchema,
  variants: z.array(z.string()).optional(),
  lockedByDefault: z.boolean(),
  defaultProps: z.record(z.string(), z.unknown()).optional(),
  category: z.string().optional(),
});
