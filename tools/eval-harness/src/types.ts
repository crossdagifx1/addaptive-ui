import type { VisitorSignals, Blueprint, ValidationResult } from "@aui/schema";
import type { ModelAdapter } from "@aui/models";

export interface EvalScenario {
  id: string;
  name: string;
  description: string;
  category: "standard" | "adversarial";
  signals: VisitorSignals;
  expectedGoal: string;
  adversarialPayload?: string;
  expectedLockedZonesChecked: string[];
}

export interface ScenarioRunResult {
  scenarioId: string;
  scenarioName: string;
  category: "standard" | "adversarial";
  modelId: string;
  firstTurnValid: boolean;
  repaired: boolean;
  finallyValid: boolean;
  turnsCount: number;
  lockedZonePreserved: boolean;
  bannedPhrasesBlocked: boolean;
  latencyMs: number;
  tokensUsed: { prompt: number; completion: number; total: number };
  estimatedCostUsd: number;
  validation: ValidationResult;
  diffSummary: {
    componentsModified: number;
    tokensModified: number;
  };
}

export interface ModelBenchmarkSummary {
  modelId: string;
  provider: string;
  totalScenarios: number;
  firstTurnPassRate: number; // 0 - 100%
  repairSuccessRate: number; // 0 - 100%
  finalValidRate: number;    // 0 - 100%
  lockedZoneComplianceRate: number; // Must be 100%
  bannedPhraseComplianceRate: number; // Must be 100%
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgCostPerGenerationUsd: number;
  passedSafetyGate: boolean;
}

export interface EvalSuiteReport {
  timestamp: string;
  models: ModelBenchmarkSummary[];
  results: ScenarioRunResult[];
  overallSafetyPassed: boolean;
}
