import type { ExperimentStats, ExperimentGuardrailConfig, GuardrailEvaluation } from './types.js';

export const DEFAULT_GUARDRAILS: ExperimentGuardrailConfig = {
  maxBounceRateIncrease: 0.15, // 15% relative increase
  maxJsErrorRate: 0.01,        // 1.0% error rate
  maxLatencyMs: 2000,          // 2.0s
  minGuardrailImpressions: 50, // Minimum sample size before auto-pausing
};

/**
 * Evaluates whether an active variant violates any safety guardrails.
 */
export function evaluateGuardrails(
  holdout: ExperimentStats,
  variant: ExperimentStats,
  config: ExperimentGuardrailConfig = DEFAULT_GUARDRAILS,
  avgLatencyMs = 0
): GuardrailEvaluation {
  const violations: string[] = [];

  // Don't auto-pause before minimum sample size is gathered
  if (variant.impressions < config.minGuardrailImpressions) {
    return {
      passed: true,
      violations: [],
      autoPauseRecommended: false,
    };
  }

  // 1. Bounce Rate Check
  const holdoutBounceRate = holdout.impressions > 0 ? holdout.bounces / holdout.impressions : 0;
  const variantBounceRate = variant.impressions > 0 ? variant.bounces / variant.impressions : 0;

  if (holdoutBounceRate > 0) {
    const relativeBounceIncrease = (variantBounceRate - holdoutBounceRate) / holdoutBounceRate;
    if (relativeBounceIncrease > config.maxBounceRateIncrease) {
      violations.push(
        `Bounce rate degraded by ${(relativeBounceIncrease * 100).toFixed(1)}% vs holdout (limit: ${(config.maxBounceRateIncrease * 100).toFixed(0)}%)`
      );
    }
  }

  // 2. JS Error Rate Check
  const errorRate = variant.impressions > 0 ? variant.errors / variant.impressions : 0;
  if (errorRate > config.maxJsErrorRate) {
    violations.push(
      `Client error rate of ${(errorRate * 100).toFixed(2)}% exceeded allowable threshold of ${(config.maxJsErrorRate * 100).toFixed(1)}%`
    );
  }

  // 3. Performance / Latency Check
  if (avgLatencyMs > config.maxLatencyMs) {
    violations.push(`Average page latency (${avgLatencyMs}ms) exceeded budget (${config.maxLatencyMs}ms)`);
  }

  const passed = violations.length === 0;

  return {
    passed,
    violations,
    autoPauseRecommended: !passed,
  };
}
