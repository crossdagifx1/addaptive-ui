/**
 * @aui/schema — Blueprint schema definitions, types, and validation schemas
 *
 * This is the central contract of the AUI Engine. Every blueprint,
 * component registration, segment, and policy reference these types.
 *
 * @packageDocumentation
 */

// ─── Blueprint Types ────────────────────────────────────────────────────────

export { type Blueprint, BlueprintSchema } from './blueprint.js';
export {
  type ComponentDefinition,
  type ComponentProps,
  type ComponentSlot,
  ComponentDefinitionSchema,
} from './component.js';
export { type DesignTokens, type TokenValue, DesignTokensSchema } from './tokens.js';
export { type Layout, type LayoutSection, LayoutSchema } from './layout.js';
export { type FlowAction, type FlowDefinition, FlowDefinitionSchema } from './flow.js';
export {
  type Segment,
  type SegmentCondition,
  SegmentSchema,
  SegmentConditionSchema,
} from './segment.js';
export { type BlueprintMeta, BlueprintMetaSchema } from './meta.js';

// ─── Component Registry Types ───────────────────────────────────────────────

export {
  type ComponentRegistration,
  type ComponentPermissions,
  type AccessibilityRules,
  ComponentRegistrationSchema,
  ComponentPermissionsSchema,
  AccessibilityRulesSchema,
} from './registry.js';

// ─── Schema Version ─────────────────────────────────────────────────────────

export { SCHEMA_VERSION, type SchemaVersion } from './constants.js';
