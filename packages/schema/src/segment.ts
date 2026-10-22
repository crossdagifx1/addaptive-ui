import { z } from 'zod';

// ─── Segment Condition ──────────────────────────────────────────────────────

/** A single condition in a segment rule */
export interface SegmentCondition {
  /** The attribute to match on */
  attribute: string;
  /** The operator for matching */
  operator: 'eq' | 'neq' | 'contains' | 'startsWith' | 'in' | 'exists';
  /** The value(s) to match */
  value: string | string[] | boolean;
}

export const SegmentConditionSchema = z.object({
  attribute: z.string(),
  operator: z.enum(['eq', 'neq', 'contains', 'startsWith', 'in', 'exists']),
  value: z.union([z.string(), z.array(z.string()), z.boolean()]),
});

// ─── Segment ────────────────────────────────────────────────────────────────

/**
 * A segment groups visitors with shared attributes.
 * Blueprints are cached per segment to keep variants bounded and fast.
 */
export interface Segment {
  /** Unique segment identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Serialized segment key (e.g., "ref:google-ads|device:mobile|lang:en|new") */
  key: string;
  /** Conditions that define this segment */
  conditions: SegmentCondition[];
  /** Priority for overlapping segments (higher wins) */
  priority: number;
  /** Description for the dashboard */
  description?: string;
}

export const SegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  conditions: z.array(SegmentConditionSchema),
  priority: z.number().int(),
  description: z.string().optional(),
});
