import { z } from 'zod';

// ─── Flow Actions ───────────────────────────────────────────────────────────

/** Allowed action types — strictly limited to prevent abuse */
export type FlowAction =
  | `navigate:${string}`
  | `scroll:${string}`
  | `open-modal:${string}`
  | `close-modal`
  | `submit-form:${string}`
  | `track:${string}`;

const FlowActionSchema = z.string().refine(
  (val) => {
    const prefixes = ['navigate:', 'scroll:', 'open-modal:', 'submit-form:', 'track:'];
    return prefixes.some((p) => val.startsWith(p)) || val === 'close-modal';
  },
  { message: 'Action must start with an allowed prefix (navigate:, scroll:, open-modal:, submit-form:, track:) or be "close-modal"' }
);

// ─── Flow Definition ────────────────────────────────────────────────────────

/** Flow layer — navigation, multi-step journeys, conditional steps */
export interface FlowDefinition {
  /** Action when primary CTA is triggered */
  onPrimaryCta?: FlowAction;
  /** Action when secondary CTA is triggered */
  onSecondaryCta?: FlowAction;
  /** Conditional steps based on context */
  conditionalSteps?: Array<{
    condition: string;
    action: FlowAction;
  }>;
  /** Named action map for custom triggers */
  actions?: Record<string, FlowAction>;
}

export const FlowDefinitionSchema = z.object({
  onPrimaryCta: FlowActionSchema.optional(),
  onSecondaryCta: FlowActionSchema.optional(),
  conditionalSteps: z.array(z.object({
    condition: z.string(),
    action: FlowActionSchema,
  })).optional(),
  actions: z.record(z.string(), FlowActionSchema).optional(),
});
