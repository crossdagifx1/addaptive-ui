import type {
  AnalyticsEvent,
  ExperimentStats,
  ExperimentGuardrailConfig,
  ExperimentReport,
} from './types.js';
import { calculateSignificance } from './significance.js';
import { evaluateGuardrails, DEFAULT_GUARDRAILS } from './guardrails.js';

interface ArmAccumulator {
  impressions: number;
  conversions: number;
  bounces: number;
  errors: number;
  totalLatencyMs: number;
  latencySamples: number;
}

function emptyAccumulator(): ArmAccumulator {
  return {
    impressions: 0,
    conversions: 0,
    bounces: 0,
    errors: 0,
    totalLatencyMs: 0,
    latencySamples: 0,
  };
}

export interface AnalyticsPipelineConfig {
  guardrails?: ExperimentGuardrailConfig;
  onAutoPause?: (report: ExperimentReport) => void;
}

export class AnalyticsPipeline {
  private events: AnalyticsEvent[] = [];
  private stats: Map<string, { holdout: ArmAccumulator; variant: ArmAccumulator }> = new Map();
  private guardrailConfig: ExperimentGuardrailConfig;
  private onAutoPause?: (report: ExperimentReport) => void;

  constructor(config: AnalyticsPipelineConfig = {}) {
    this.guardrailConfig = config.guardrails || DEFAULT_GUARDRAILS;
    this.onAutoPause = config.onAutoPause;
  }

  private getBucketKey(siteId: string, segmentKey: string): string {
    return `${siteId}:${segmentKey}`;
  }

  private getOrCreateArms(siteId: string, segmentKey: string) {
    const key = this.getBucketKey(siteId, segmentKey);
    let arms = this.stats.get(key);
    if (!arms) {
      arms = { holdout: emptyAccumulator(), variant: emptyAccumulator() };
      this.stats.set(key, arms);
    }
    return arms;
  }

  recordEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    const arms = this.getOrCreateArms(event.siteId, event.segmentKey);
    const arm = event.group === 'holdout' ? arms.holdout : arms.variant;

    if (event.type === 'impression') {
      arm.impressions++;
      if (event.properties?.latencyMs && typeof event.properties.latencyMs === 'number') {
        arm.totalLatencyMs += event.properties.latencyMs;
        arm.latencySamples++;
      }
    } else if (event.type === 'conversion') {
      arm.conversions++;
    } else if (event.type === 'error') {
      arm.errors++;
    }

    if (event.dwellTimeMs !== undefined && event.dwellTimeMs < 10000 && !event.scrollDepthPercent) {
      arm.bounces++;
    }

    // Check guardrails on new impressions
    if (event.type === 'impression' || event.type === 'error') {
      const report = this.getReport({
        siteId: event.siteId,
        pageId: event.pageId,
        segmentKey: event.segmentKey,
        variantBlueprintId: event.blueprintId,
        holdoutBlueprintId: 'bp_holdout_default',
      });

      if (report.status === 'auto_paused' && this.onAutoPause) {
        this.onAutoPause(report);
      }
    }
  }

  getReport(options: {
    siteId: string;
    pageId: string;
    segmentKey: string;
    variantBlueprintId: string;
    holdoutBlueprintId: string;
  }): ExperimentReport {
    const { siteId, pageId, segmentKey, variantBlueprintId, holdoutBlueprintId } = options;
    const arms = this.getOrCreateArms(siteId, segmentKey);

    const holdoutStats: ExperimentStats = {
      impressions: arms.holdout.impressions,
      conversions: arms.holdout.conversions,
      conversionRate: arms.holdout.impressions > 0 ? arms.holdout.conversions / arms.holdout.impressions : 0,
      bounces: arms.holdout.bounces,
      bounceRate: arms.holdout.impressions > 0 ? arms.holdout.bounces / arms.holdout.impressions : 0,
      errors: arms.holdout.errors,
      errorRate: arms.holdout.impressions > 0 ? arms.holdout.errors / arms.holdout.impressions : 0,
    };

    const variantStats: ExperimentStats = {
      impressions: arms.variant.impressions,
      conversions: arms.variant.conversions,
      conversionRate: arms.variant.impressions > 0 ? arms.variant.conversions / arms.variant.impressions : 0,
      bounces: arms.variant.bounces,
      bounceRate: arms.variant.impressions > 0 ? arms.variant.bounces / arms.variant.impressions : 0,
      errors: arms.variant.errors,
      errorRate: arms.variant.impressions > 0 ? arms.variant.errors / arms.variant.impressions : 0,
    };

    const significance = calculateSignificance(holdoutStats, variantStats);

    const avgLatency =
      arms.variant.latencySamples > 0
        ? Math.round(arms.variant.totalLatencyMs / arms.variant.latencySamples)
        : 0;

    const guardrails = evaluateGuardrails(
      holdoutStats,
      variantStats,
      this.guardrailConfig,
      avgLatency
    );

    let status: ExperimentReport['status'] = 'running';
    if (guardrails.autoPauseRecommended) {
      status = 'auto_paused';
    } else if (significance.statisticallySignificant) {
      status = 'statistically_significant_win';
    } else if (!significance.sampleSizeAdequate) {
      status = 'inconclusive';
    }

    return {
      siteId,
      pageId,
      segmentKey,
      variantBlueprintId,
      holdoutBlueprintId,
      significance,
      guardrails,
      status,
      generatedAt: new Date().toISOString(),
    };
  }

  getRecentEvents(limit = 100): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse();
  }
}

export function createAnalyticsPipeline(config?: AnalyticsPipelineConfig): AnalyticsPipeline {
  return new AnalyticsPipeline(config);
}
