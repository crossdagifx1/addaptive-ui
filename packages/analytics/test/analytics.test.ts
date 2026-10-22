import { describe, it, expect, vi } from 'vitest';
import {
  assignTrafficGroup,
  hashToBucket,
  calculateSignificance,
  evaluateGuardrails,
  createAnalyticsPipeline,
  type ExperimentStats,
} from '../src/index.js';

describe('@aui/analytics', () => {
  describe('Traffic Splitting & Holdout Groups', () => {
    it('deterministically assigns the same session to the same group', () => {
      const sessionId = 'sess_user_9921';
      const expId = 'exp_homepage_b2b';

      const first = assignTrafficGroup({ sessionId, experimentId: expId, holdoutPercent: 10 });
      const second = assignTrafficGroup({ sessionId, experimentId: expId, holdoutPercent: 10 });
      expect(first).toBe(second);
    });

    it('supports 5% canary rollouts', () => {
      let variantCount = 0;
      const total = 1000;

      for (let i = 0; i < total; i++) {
        const group = assignTrafficGroup({
          sessionId: `sess_${i}`,
          experimentId: 'canary_test',
          rolloutPercent: 5,
          holdoutPercent: 0,
        });
        if (group === 'variant') variantCount++;
      }

      // Expected ~50 variants out of 1000 (around 4-6%)
      const pct = (variantCount / total) * 100;
      expect(pct).toBeGreaterThanOrEqual(3.5);
      expect(pct).toBeLessThanOrEqual(6.5);
    });
  });

  describe('Significance Engine (Two-Proportion Z-Test)', () => {
    it('calculates significant lift for high-performing variants', () => {
      const holdout: ExperimentStats = {
        impressions: 1000,
        conversions: 50, // 5.0%
        conversionRate: 0.05,
        bounces: 300,
        bounceRate: 0.3,
        errors: 0,
        errorRate: 0,
      };

      const variant: ExperimentStats = {
        impressions: 1000,
        conversions: 80, // 8.0% (60% relative lift!)
        conversionRate: 0.08,
        bounces: 280,
        bounceRate: 0.28,
        errors: 0,
        errorRate: 0,
      };

      const res = calculateSignificance(holdout, variant);
      expect(res.sampleSizeAdequate).toBe(true);
      expect(res.relativeLiftPercent).toBeCloseTo(60, 0);
      expect(res.pValue).toBeLessThan(0.05);
      expect(res.statisticallySignificant).toBe(true);
      expect(res.confidenceInterval95[0]).toBeGreaterThan(0);
    });

    it('marks low-sample sizes as inadequate before claiming significance', () => {
      const holdout: ExperimentStats = {
        impressions: 10,
        conversions: 1,
        conversionRate: 0.1,
        bounces: 2,
        bounceRate: 0.2,
        errors: 0,
        errorRate: 0,
      };

      const variant: ExperimentStats = {
        impressions: 10,
        conversions: 5,
        conversionRate: 0.5,
        bounces: 1,
        bounceRate: 0.1,
        errors: 0,
        errorRate: 0,
      };

      const res = calculateSignificance(holdout, variant, 30);
      expect(res.sampleSizeAdequate).toBe(false);
      expect(res.statisticallySignificant).toBe(false);
    });
  });

  describe('Guardrail Monitoring & Auto-Pause', () => {
    it('passes when metrics are healthy', () => {
      const holdout: ExperimentStats = {
        impressions: 100,
        conversions: 10,
        conversionRate: 0.1,
        bounces: 30,
        bounceRate: 0.3,
        errors: 0,
        errorRate: 0,
      };

      const variant: ExperimentStats = {
        impressions: 100,
        conversions: 14,
        conversionRate: 0.14,
        bounces: 31,
        bounceRate: 0.31,
        errors: 0,
        errorRate: 0,
      };

      const evaluation = evaluateGuardrails(holdout, variant);
      expect(evaluation.passed).toBe(true);
      expect(evaluation.autoPauseRecommended).toBe(false);
    });

    it('triggers auto-pause recommendation when bounce rate degrades severely', () => {
      const holdout: ExperimentStats = {
        impressions: 100,
        conversions: 10,
        conversionRate: 0.1,
        bounces: 20,
        bounceRate: 0.2, // 20% bounce rate baseline
        errors: 0,
        errorRate: 0,
      };

      const variant: ExperimentStats = {
        impressions: 100,
        conversions: 5,
        conversionRate: 0.05,
        bounces: 45, // 45% bounce rate (>100% relative increase!)
        bounceRate: 0.45,
        errors: 0,
        errorRate: 0,
      };

      const evaluation = evaluateGuardrails(holdout, variant);
      expect(evaluation.passed).toBe(false);
      expect(evaluation.autoPauseRecommended).toBe(true);
      expect(evaluation.violations[0]).toContain('Bounce rate degraded');
    });

    it('triggers auto-pause recommendation when client error rate exceeds 1%', () => {
      const holdout: ExperimentStats = {
        impressions: 100,
        conversions: 10,
        conversionRate: 0.1,
        bounces: 20,
        bounceRate: 0.2,
        errors: 0,
        errorRate: 0,
      };

      const variant: ExperimentStats = {
        impressions: 100,
        conversions: 10,
        conversionRate: 0.1,
        bounces: 20,
        bounceRate: 0.2,
        errors: 4, // 4% error rate > 1% limit
        errorRate: 0.04,
      };

      const evaluation = evaluateGuardrails(holdout, variant);
      expect(evaluation.passed).toBe(false);
      expect(evaluation.autoPauseRecommended).toBe(true);
      expect(evaluation.violations[0]).toContain('Client error rate');
    });
  });

  describe('Analytics Pipeline Event Intake & Reporting', () => {
    it('accumulates impressions, conversions, and produces defensible lift report', () => {
      const onAutoPause = vi.fn();
      const pipeline = createAnalyticsPipeline({ onAutoPause });

      // Simulate 100 holdout impressions + 10 conversions (10% CR)
      for (let i = 0; i < 100; i++) {
        pipeline.recordEvent({
          id: `evt_h_${i}`,
          siteId: 'site_test',
          pageId: 'landing',
          sessionId: `sess_h_${i}`,
          type: 'impression',
          timestamp: new Date().toISOString(),
          group: 'holdout',
          segmentKey: 'developer-speed',
          blueprintId: 'bp_holdout_default',
        });
        if (i < 10) {
          pipeline.recordEvent({
            id: `evt_hc_${i}`,
            siteId: 'site_test',
            pageId: 'landing',
            sessionId: `sess_h_${i}`,
            type: 'conversion',
            timestamp: new Date().toISOString(),
            group: 'holdout',
            segmentKey: 'developer-speed',
            blueprintId: 'bp_holdout_default',
          });
        }
      }

      // Simulate 100 variant impressions + 18 conversions (18% CR, +80% relative lift)
      for (let i = 0; i < 100; i++) {
        pipeline.recordEvent({
          id: `evt_v_${i}`,
          siteId: 'site_test',
          pageId: 'landing',
          sessionId: `sess_v_${i}`,
          type: 'impression',
          timestamp: new Date().toISOString(),
          group: 'variant',
          segmentKey: 'developer-speed',
          blueprintId: 'bp_var_dev_speed',
        });
        if (i < 18) {
          pipeline.recordEvent({
            id: `evt_vc_${i}`,
            siteId: 'site_test',
            pageId: 'landing',
            sessionId: `sess_v_${i}`,
            type: 'conversion',
            timestamp: new Date().toISOString(),
            group: 'variant',
            segmentKey: 'developer-speed',
            blueprintId: 'bp_var_dev_speed',
          });
        }
      }

      const report = pipeline.getReport({
        siteId: 'site_test',
        pageId: 'landing',
        segmentKey: 'developer-speed',
        variantBlueprintId: 'bp_var_dev_speed',
        holdoutBlueprintId: 'bp_holdout_default',
      });

      expect(report.significance.relativeLiftPercent).toBeCloseTo(80, 0);
      expect(report.significance.holdout.conversionRate).toBe(0.1);
      expect(report.significance.variant.conversionRate).toBe(0.18);
      expect(report.guardrails.passed).toBe(true);
      expect(onAutoPause).not.toHaveBeenCalled();
    });
  });
});
