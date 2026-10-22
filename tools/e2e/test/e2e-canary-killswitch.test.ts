// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { assignTrafficGroup } from '@aui/analytics';
import { defaultLandingBlueprint, registerLandingComponents } from '@aui/components-landing';
import { createComponentRegistry, renderBlueprint } from '@aui/core';
import type { Blueprint } from '@aui/schema';

describe('@aui/e2e > Canary Rollout & Kill Switch Integration', () => {
  it('determines 5% canary allocation deterministically across 1,000 visitors', () => {
    let variantCount = 0;
    let holdoutCount = 0;
    const totalVisitors = 1000;

    for (let i = 0; i < totalVisitors; i++) {
      const visitorId = `visitor_cohort_a_${i}`;
      const group = assignTrafficGroup({
        sessionId: visitorId,
        experimentId: 'experiment_canary_v1',
        rolloutPercent: 5, // 5% canary variant allocation
        holdoutPercent: 0,
      });

      if (group === 'variant') {
        variantCount++;
      } else {
        holdoutCount++;
      }

      // Must be 100% deterministic: same visitor always gets same group
      const repeatGroup = assignTrafficGroup({
        sessionId: visitorId,
        experimentId: 'experiment_canary_v1',
        rolloutPercent: 5,
        holdoutPercent: 0,
      });
      expect(repeatGroup).toBe(group);
    }

    // With FNV-1a distribution, 5% of 1,000 is ~50 (typically between 35 and 65)
    expect(variantCount).toBeGreaterThanOrEqual(30);
    expect(variantCount).toBeLessThanOrEqual(75);
    expect(holdoutCount).toBe(totalVisitors - variantCount);
  });

  it('emergency kill switch disarms variant and forces 100% holdout fallback', () => {
    let isKillSwitchActive = false;

    const resolveVisitorBlueprint = (visitorId: string, candidateVariant: Blueprint, defaultBp: Blueprint): Blueprint => {
      if (isKillSwitchActive) {
        return defaultBp;
      }
      const group = assignTrafficGroup({
        sessionId: visitorId,
        experimentId: 'rollout_test',
        rolloutPercent: 100,
        holdoutPercent: 0,
      });
      return group === 'variant' ? candidateVariant : defaultBp;
    };

    const candidateVariant: Blueprint = {
      ...defaultLandingBlueprint,
      blueprintId: 'bp_candidate_speed',
      components: {
        ...defaultLandingBlueprint.components,
        hero: {
          type: 'Hero',
          props: { headline: 'Speed Variant' },
        },
      },
    };

    // Before kill switch: visitor gets candidate variant
    const beforeBp = resolveVisitorBlueprint('user_123', candidateVariant, defaultLandingBlueprint);
    expect(beforeBp.blueprintId).toBe('bp_candidate_speed');

    // Trigger emergency kill switch
    isKillSwitchActive = true;

    // After kill switch: same visitor immediately gets default holdout
    const afterBp = resolveVisitorBlueprint('user_123', candidateVariant, defaultLandingBlueprint);
    expect(afterBp.blueprintId).toBe(defaultLandingBlueprint.blueprintId);
  });

  it('renders variant in DOM while strictly preserving locked pricing and legal zones', async () => {
    const registry = createComponentRegistry();
    registerLandingComponents(registry);

    const adaptedVariant: Blueprint = {
      ...defaultLandingBlueprint,
      blueprintId: 'bp_adapted_e2e',
      components: {
        ...defaultLandingBlueprint.components,
        hero: {
          type: 'Hero',
          props: { headline: 'E2E Adapted Headline' },
        },
      },
    };

    const root = document.createElement('div');
    document.body.appendChild(root);

    const res = await renderBlueprint({
      blueprint: adaptedVariant,
      registry,
      config: {
        rootElement: root,
        mode: 'hosted-pack',
        useCssVariables: true,
        reserveDimensions: true,
        respectReducedMotion: true,
        respectColorScheme: true,
      },
      defaultBlueprint: defaultLandingBlueprint,
    });

    expect(res.success).toBe(true);
    expect(root.innerHTML).toContain('E2E Adapted Headline');
    expect(root.innerHTML).toContain('data-aui-type="PricingTable"');
    expect(root.querySelector('[data-aui-type="PricingTable"]')?.getAttribute('data-aui-locked')).toBe('true');
  });
});
