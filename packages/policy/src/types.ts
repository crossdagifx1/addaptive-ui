// ─── Policy Types ───────────────────────────────────────────────────────────

/** A declarative policy rule */
export interface PolicyRule {
  /** Rule identifier */
  id: string;
  /** Rule type */
  type: 'locked' | 'banned-phrase' | 'required-element' | 'allowed-action' |
        'max-changes' | 'accessibility' | 'custom';
  /** The rule's configuration */
  config: Record<string, unknown>;
  /** Whether violation of this rule blocks rendering */
  severity: 'error' | 'warning';
  /** Human-readable description */
  description?: string;
}

/** A complete policy document */
export interface Policy {
  /** Policy identifier */
  id: string;
  /** Policy version */
  version: string;
  /** Locked zones (component types the AI may never alter) */
  locked: string[];
  /** Banned phrases (exact or pattern matches) */
  bannedPhrases: string[];
  /** Required elements that must be present */
  requiredElements: string[];
  /** Allowed action prefixes */
  allowedActions: string[];
  /** Maximum number of section changes per generation */
  maxSectionChanges: number;
  /** Accessibility settings */
  a11y: {
    minContrast: number;
    requireAltText: boolean;
  };
  /** Additional custom rules */
  rules: PolicyRule[];
}

/** Result of evaluating a policy against a blueprint */
export interface PolicyResult {
  /** Whether the blueprint passes the policy */
  passed: boolean;
  /** Violations found */
  violations: Array<{
    ruleId: string;
    message: string;
    severity: 'error' | 'warning';
    path?: string;
  }>;
}
