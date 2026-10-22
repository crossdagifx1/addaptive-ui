import { z } from 'zod';
import { DesignTokensSchema, type DesignTokens } from './tokens.js';
import { LayoutSchema, type Layout } from './layout.js';
import { ComponentDefinitionSchema, type ComponentDefinition } from './component.js';
import { FlowDefinitionSchema, type FlowDefinition } from './flow.js';
import { BlueprintMetaSchema, type BlueprintMeta } from './meta.js';
import { SCHEMA_VERSION } from './constants.js';

// ─── Blueprint ──────────────────────────────────────────────────────────────

/**
 * A Blueprint is the central contract of AUI Engine.
 *
 * It is a JSON document that fully describes a page: tokens, layout,
 * components, content, and flow. The AI generates blueprints; the
 * validator checks them; the renderer displays them.
 *
 * Key rules:
 * - UI is data, not code. No executable code in a blueprint.
 * - Every blueprint is validated before rendering.
 * - Invalid blueprints fall back to the default instantly.
 */
export interface Blueprint {
  /** Schema version for forward/backward compatibility */
  schemaVersion: string;
  /** Unique blueprint identifier */
  blueprintId: string;
  /** The page this blueprint applies to */
  pageId: string;
  /** Segment key identifying the target visitor group */
  segment: string;
  /** Design tokens — layer 1 */
  tokens?: DesignTokens;
  /** Layout definition — layer 2 */
  layout: Layout;
  /** Component instances keyed by section name — layers 3 & 4 */
  components: Record<string, ComponentDefinition>;
  /** Flow definition — layer 5 */
  flow?: FlowDefinition;
  /** Generation metadata */
  meta: BlueprintMeta;
}

/**
 * Zod schema for full blueprint validation.
 * Used by the validator, the decision service, and the CLI.
 */
export const BlueprintSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  blueprintId: z.string(),
  pageId: z.string(),
  segment: z.string(),
  tokens: DesignTokensSchema.optional(),
  layout: LayoutSchema,
  components: z.record(z.string(), ComponentDefinitionSchema),
  flow: FlowDefinitionSchema.optional(),
  meta: BlueprintMetaSchema,
});
