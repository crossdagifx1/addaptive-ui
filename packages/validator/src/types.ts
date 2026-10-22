// ─── Validation Stages ──────────────────────────────────────────────────────

/** The ordered stages of blueprint validation (Section 8.1 of the plan) */
export type ValidationStage =
  | 'schema'          // JSON Schema validation of the whole blueprint
  | 'component'       // Only registered components; props match schemas
  | 'permission'      // AI may only change permitted layers/props
  | 'locked-zone'     // No modification to locked content
  | 'content-policy'  // Banned phrases, required disclaimers, claim rules
  | 'link-action'     // Actions limited to allowlist; URLs allowlisted
  | 'accessibility'   // Contrast, heading order, labels, focus, motion
  | 'size-budget'     // DOM node count, image weight, section count
  | 'diff-size';      // Change relative to default within limits

// ─── Validation Error ───────────────────────────────────────────────────────

/** A single validation failure */
export interface ValidationError {
  /** Which stage caught this error */
  stage: ValidationStage;
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** JSON path to the offending value */
  path?: string;
  /** The problematic value */
  value?: unknown;
  /** Severity: error blocks rendering, warning is logged */
  severity: 'error' | 'warning';
}

// ─── Validation Result ──────────────────────────────────────────────────────

/** The result of validating a blueprint through all stages */
export interface ValidationResult {
  /** Whether the blueprint passed all required checks */
  valid: boolean;
  /** List of errors and warnings */
  errors: ValidationError[];
  /** Which stages were executed */
  stagesRun: ValidationStage[];
  /** Total validation time in milliseconds */
  durationMs: number;
}
