import { z } from 'zod';

// ─── Blueprint Metadata ─────────────────────────────────────────────────────

/** Metadata about how and why a blueprint was generated */
export interface BlueprintMeta {
  /** Which model adapter generated this blueprint */
  generatedBy: string;
  /** The model's reasoning for the adaptations made */
  reasoning?: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** Parent blueprint ID (for version history / rollback) */
  parentBlueprintId?: string;
  /** The prompt template version used */
  promptVersion?: string;
  /** Generation latency in milliseconds */
  latencyMs?: number;
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Approval status */
  status?: 'pending' | 'approved' | 'rejected' | 'auto-applied';
  /** Who approved (user ID or "auto") */
  approvedBy?: string;
  /** Cryptographic HMAC-SHA256 signature for signed blueprints */
  signature?: string;
}

export const BlueprintMetaSchema = z.object({
  generatedBy: z.string(),
  reasoning: z.string().optional(),
  createdAt: z.string().datetime(),
  parentBlueprintId: z.string().optional(),
  promptVersion: z.string().optional(),
  latencyMs: z.number().nonnegative().optional(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'auto-applied']).optional(),
  approvedBy: z.string().optional(),
  signature: z.string().optional(),
});

