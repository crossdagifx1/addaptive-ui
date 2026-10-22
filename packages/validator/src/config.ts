import type { ComponentRegistration } from '@aui/schema';

// ─── Validator Configuration ────────────────────────────────────────────────

/** Configuration for the validation pipeline */
export interface ValidatorConfig {
  /** Registered components catalog */
  componentRegistry: ComponentRegistration[];
  /** Locked zones (component types that cannot be modified) */
  lockedZones: string[];
  /** Content policy rules */
  contentPolicy: {
    bannedPhrases: string[];
    requiredElements: string[];
    allowedActions: string[];
    allowedExternalUrls?: string[];
  };
  /** Accessibility requirements */
  accessibility: {
    minContrast: number;
    requireAltText: boolean;
    requireHeadingOrder: boolean;
  };
  /** Size budgets */
  sizeBudget: {
    maxSections: number;
    maxDomNodes?: number;
    maxImageWeightKb?: number;
  };
  /** Diff limits (relative to default blueprint) */
  diffLimits: {
    maxSectionChanges: number;
    maxTokenChanges?: number;
    maxPropChanges?: number;
  };
}
