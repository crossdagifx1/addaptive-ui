import type { Blueprint, ComponentRegistration } from '@aui/schema';
import { validateBlueprint, type ValidatorConfig, type ValidationResult } from '@aui/validator';
import { evaluatePolicy, type Policy } from '@aui/policy';
import type { ModelRouter } from '@aui/models';
import type { DecisionPipelineConfig, DecisionResult } from './types.js';
import { createContextBuilder } from './context.js';
import { createPromptComposer, DEFAULT_PROMPT_TEMPLATE, type PromptTemplate } from './prompt.js';

export interface DecisionPipeline {
  generateBlueprint(options: {
    signals: Record<string, unknown>;
    defaultBlueprint: Blueprint;
    catalog: ComponentRegistration[];
    policy: Policy;
    validatorConfig: ValidatorConfig;
    promptTemplate?: PromptTemplate;
  }): Promise<DecisionResult>;
}

/**
 * Creates the AUI Decision Pipeline.
 */
export function createDecisionPipeline(
  config: DecisionPipelineConfig,
  router: ModelRouter,
): DecisionPipeline {
  const contextBuilder = createContextBuilder();
  const promptComposer = createPromptComposer();

  return {
    async generateBlueprint(options) {
      const startTime = performance.now();
      const { signals, defaultBlueprint, catalog, policy, validatorConfig, promptTemplate } = options;

      // 1. Build minimal, privacy-filtered visitor context
      const context = contextBuilder.build(signals);

      // 2. Format catalog and policy constraints
      const catalogSummary = catalog
        .map((c) => `- ${c.type} (${c.displayName}): ${c.description} [Editable props: ${c.permissions.editable.join(', ') || 'none'}] [Locked: ${c.lockedByDefault}]`)
        .join('\n');

      const constraintSummary = `
- Locked component types: ${policy.locked.join(', ')}
- Banned phrases: ${policy.bannedPhrases.join(', ')}
- Allowed action prefixes: ${policy.allowedActions.join(', ')}
- Maximum section modifications: ${policy.maxSectionChanges}
`;

      const template = promptTemplate || DEFAULT_PROMPT_TEMPLATE;
      let composed = promptComposer.compose(
        template,
        context,
        catalogSummary,
        constraintSummary,
        JSON.stringify(defaultBlueprint, null, 2),
      );

      const adapter = router.selectAdapter({ taskType: 'landing-adaptation' });
      let repairAttempts = 0;
      let lastValidation: ValidationResult = {
        valid: false,
        errors: [],
        stagesRun: [],
        durationMs: 0,
      };

      const maxAttempts = 1 + config.maxRepairRetries;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const genResult = await adapter.generate({
            system: composed.system,
            input: composed.input,
            outputSchema: {},
            timeoutMs: 15000,
          });

          // Attempt to parse JSON if not already parsed
          let parsedData = genResult.parsed;
          if (!parsedData && genResult.raw) {
            let clean = genResult.raw.trim();
            if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
            try {
              parsedData = JSON.parse(clean);
            } catch {
              parsedData = null;
            }
          }

          if (!parsedData || typeof parsedData !== 'object') {
            repairAttempts++;
            composed.input += `\n\n[REPAIR ATTEMPT ${repairAttempts}]: Your previous output was not valid JSON. Please return strictly a valid JSON object matching the Blueprint schema.`;
            continue;
          }

          const candidate = parsedData as Blueprint;

          // Validate candidate blueprint with 9-stage validator
          lastValidation = validateBlueprint(candidate, validatorConfig, defaultBlueprint);

          // Evaluate policy
          const policyRes = evaluatePolicy(candidate, policy, defaultBlueprint);
          if (!policyRes.passed) {
            for (const v of policyRes.violations) {
              lastValidation.errors.push({
                stage: 'content-policy',
                code: v.ruleId,
                message: v.message,
                severity: v.severity,
                path: v.path,
              });
            }
            lastValidation.valid = false;
          }

          if (lastValidation.valid) {
            const needsApproval = config.approvalMode !== 'auto-apply';
            return {
              blueprint: candidate,
              validation: lastValidation,
              adapterId: adapter.id,
              repairAttempts,
              totalLatencyMs: performance.now() - startTime,
              needsApproval,
              reasoning: candidate.meta?.reasoning,
            };
          }

          // If validation failed, feed errors into next repair attempt
          repairAttempts++;
          const errorSummary = lastValidation.errors.map((e) => `• [${e.stage}] ${e.message}`).join('\n');
          composed.input += `\n\n[REPAIR ATTEMPT ${repairAttempts}]: The blueprint failed safety validation with the following errors:\n${errorSummary}\nPlease fix these issues and regenerate the valid JSON Blueprint.`;
        } catch {
          repairAttempts++;
        }
      }

      // If all attempts failed, return null blueprint with graceful fallback info
      return {
        blueprint: null,
        validation: lastValidation,
        adapterId: adapter.id,
        repairAttempts,
        totalLatencyMs: performance.now() - startTime,
        needsApproval: false,
      };
    },
  };
}
