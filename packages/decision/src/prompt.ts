import type { VisitorContext } from './context.js';

/** A versioned prompt template */
export interface PromptTemplate {
  /** Template version */
  version: string;
  /** System prompt template */
  system: string;
  /** User/input prompt template */
  input: string;
  /** Variables available in the templates */
  variables: string[];
}

/** Composes prompts from templates and context */
export interface PromptComposer {
  /** Compose the final system and input prompts */
  compose(
    template: PromptTemplate,
    context: VisitorContext,
    componentCatalog: string,
    constraints: string,
    defaultBlueprintJson?: string,
  ): { system: string; input: string };
}

/** Default versioned prompt template (v1.0) */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  version: '1.0',
  system: `You are the AUI Decision Engine. Your goal is to adapt a website's UI blueprint to maximize relevance and engagement for the current visitor segment, while strictly adhering to safety policies and locked zones.

CRITICAL RULES:
1. Output MUST be a valid JSON Blueprint conforming to the Blueprint schema. No markdown formatting, code fences, or prose outside the JSON.
2. NEVER modify or remove components marked as locked zones (e.g., PricingTable, LegalFooter, LeadForm).
3. Do not use deceptive claims, false urgency, or banned phrases.
4. Only use component types from the approved component catalog.
5. Return JSON object with schemaVersion: "1.0", blueprintId, pageId, segment, tokens, layout, components, and meta (including reasoning).`,

  input: `VISITOR CONTEXT:
- Referrer: {{referrer}}
- Campaign/UTM: {{campaign}}
- Device: {{device}}
- Locale: {{locale}}
- Returning Visitor: {{returning}}
- Segment Key: {{segmentKey}}

APPROVED COMPONENT CATALOG:
{{componentCatalog}}

CONSTRAINTS & POLICIES:
{{constraints}}

DEFAULT BLUEPRINT TO ADAPT:
{{defaultBlueprint}}

Generate an adapted Blueprint optimized for this visitor.`,
  variables: ['referrer', 'campaign', 'device', 'locale', 'returning', 'segmentKey', 'componentCatalog', 'constraints', 'defaultBlueprint'],
};

/**
 * Creates a PromptComposer instance.
 */
export function createPromptComposer(): PromptComposer {
  return {
    compose(template, context, componentCatalog, constraints, defaultBlueprintJson = '{}') {
      let input = template.input;

      input = input.replace('{{referrer}}', context.referrer || 'Direct / None');
      input = input.replace('{{campaign}}', context.campaign ? JSON.stringify(context.campaign) : 'None');
      input = input.replace('{{device}}', context.device);
      input = input.replace('{{locale}}', context.locale);
      input = input.replace('{{returning}}', String(context.returning));
      input = input.replace('{{segmentKey}}', context.segmentKey);
      input = input.replace('{{componentCatalog}}', componentCatalog);
      input = input.replace('{{constraints}}', constraints);
      input = input.replace('{{defaultBlueprint}}', defaultBlueprintJson);

      return {
        system: template.system,
        input,
      };
    },
  };
}
