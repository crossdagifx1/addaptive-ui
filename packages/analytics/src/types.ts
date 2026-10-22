export type EventType =
  | 'impression'
  | 'conversion'
  | 'interaction'
  | 'guardrail_metric'
  | 'error';

export type TrafficGroup = 'holdout' | 'variant';

export interface GoalDefinition {
  id: string;
  name: string;
  type: 'click' | 'signup' | 'purchase' | 'custom';
  selector?: string;
  urlPattern?: string;
  targetValueUsd?: number;
}

export interface AnalyticsEvent {
  id: string;
  siteId: string;
  pageId: string;
  sessionId: string;
  type: EventType;
  timestamp: string;
  group: TrafficGroup;
  segmentKey: string;
  blueprintId: string;
  goalId?: string;
  dwellTimeMs?: number;
  scrollDepthPercent?: number;
  errorDetails?: string;
  properties?: Record<string, unknown>;
}

export interface ExperimentGuardrailConfig {
  /** Maximum allowable relative increase in bounce rate (e.g. 0.15 = 15%) */
  maxBounceRateIncrease: number;
  /** Maximum acceptable client-side JS error rate (e.g. 0.01 = 1%) */
  maxJsErrorRate: number;
  /** Maximum acceptable average latency in ms */
  maxLatencyMs: number;
  /** Minimum impressions per arm before triggering guardrail auto-pause */
  minGuardrailImpressions: number;
}

export interface ExperimentStats {
  impressions: number;
  conversions: number;
  conversionRate: number; // 0.0 - 1.0
  bounces: number;
  bounceRate: number;
  errors: number;
  errorRate: number;
}

export interface SignificanceResult {
  holdout: ExperimentStats;
  variant: ExperimentStats;
  absoluteLift: number;
  relativeLiftPercent: number; // e.g. +28.4%
  zScore: number;
  pValue: number;
  statisticallySignificant: boolean; // pValue < 0.05
  confidenceInterval95: [number, number];
  sampleSizeAdequate: boolean;
}

export interface GuardrailEvaluation {
  passed: boolean;
  violations: string[];
  autoPauseRecommended: boolean;
}

export interface ExperimentReport {
  siteId: string;
  pageId: string;
  segmentKey: string;
  variantBlueprintId: string;
  holdoutBlueprintId: string;
  significance: SignificanceResult;
  guardrails: GuardrailEvaluation;
  status: 'running' | 'statistically_significant_win' | 'inconclusive' | 'auto_paused';
  generatedAt: string;
}
