import type { Blueprint } from '@aui/schema';
import type { ValidationResult } from '@aui/validator';
import type { ModelRouterConfig } from '@aui/models';

/** Configuration for the decision pipeline */
export interface DecisionPipelineConfig {
  /** Model router configuration */
  modelRouter: ModelRouterConfig;
  /** Approval mode */
  approvalMode: 'auto-apply' | 'suggest-only' | 'approve-first';
  /** Maximum repair retries */
  maxRepairRetries: number;
  /** Generation mode */
  generationMode: 'full-blueprint' | 'diff-patch';
}

/** Result of running the decision pipeline */
export interface DecisionResult {
  /** The generated (and validated) blueprint, or null if all attempts failed */
  blueprint: Blueprint | null;
  /** Validation result */
  validation: ValidationResult;
  /** Which model adapter was used */
  adapterId: string;
  /** Number of repair attempts needed */
  repairAttempts: number;
  /** Total pipeline latency in milliseconds */
  totalLatencyMs: number;
  /** Whether the result needs approval */
  needsApproval: boolean;
  /** The model's reasoning */
  reasoning?: string;
}
