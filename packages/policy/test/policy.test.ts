import { describe, it, expect } from 'vitest';
import type { Blueprint } from '@aui/schema';
import { evaluatePolicy, DEFAULT_POLICY, type Policy } from '../src/index.js';

describe('@aui/policy', () => {
  const customPolicy: Policy = {
    id: 'prod-safeguards',
    version: '1.0',
    locked: ['PricingTable', 'LegalFooter'],
    bannedPhrases: ['guaranteed returns', 'zero risk', 'limited time offer'],
    requiredElements: ['privacy-link'],
    allowedActions: ['navigate', 'scroll', 'open-modal'],
    maxSectionChanges: 2,
    a11y: {
      minContrast: 4.5,
      requireAltText: true,
    },
    rules: [],
  };

  const cleanBlueprint: Blueprint = {
    schemaVersion: '1.0',
    blueprintId: 'bp_pol_1',
    pageId: 'landing',
    segment: 'default',
    layout: {
      type: 'stack',
      sections: ['hero', 'pricing', 'footer'],
    },
    components: {
      hero: {
        type: 'Hero',
        props: {
          headline: 'Enterprise Cloud Architecture',
          subheadline: 'Includes privacy-link below for compliance.',
        },
      },
      pricing: {
        type: 'PricingTable',
        locked: true,
        props: { plans: [{ name: 'Standard', price: '$20' }] },
      },
      footer: {
        type: 'LegalFooter',
        locked: true,
        props: { text: 'Copyright 2026' },
      },
    },
    meta: {
      generatedBy: 'test',
      createdAt: new Date().toISOString(),
    },
  };

  it('ships with sensible DEFAULT_POLICY', () => {
    expect(DEFAULT_POLICY.locked).toContain('PricingTable');
    expect(DEFAULT_POLICY.locked).toContain('LeadForm');
    expect(DEFAULT_POLICY.locked).toContain('LegalFooter');
    expect(DEFAULT_POLICY.bannedPhrases.length).toBeGreaterThan(0);
  });

  it('passes when blueprint respects all policies', () => {
    const res = evaluatePolicy(cleanBlueprint, customPolicy);
    expect(res.passed).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it('flags violations if locked zone is modified compared to default', () => {
    const defaultBp = cleanBlueprint;
    const modifiedBp: Blueprint = {
      ...cleanBlueprint,
      components: {
        ...cleanBlueprint.components,
        pricing: {
          type: 'PricingTable',
          locked: true,
          props: { plans: [{ name: 'Discounted Price', price: '$5' }] },
        },
      },
    };

    const res = evaluatePolicy(modifiedBp, customPolicy, defaultBp);
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'locked-zone-modified')).toBe(true);
  });

  it('flags banned phrases in copy', () => {
    const copyViolatingBp: Blueprint = {
      ...cleanBlueprint,
      components: {
        ...cleanBlueprint.components,
        hero: {
          type: 'Hero',
          props: {
            headline: 'Invest now with zero risk and guaranteed returns!',
          },
        },
      },
    };

    const res = evaluatePolicy(copyViolatingBp, customPolicy);
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'banned-phrase')).toBe(true);
  });

  it('flags missing required elements', () => {
    const missingReqBp: Blueprint = {
      ...cleanBlueprint,
      components: {
        ...cleanBlueprint.components,
        hero: {
          type: 'Hero',
          props: { headline: 'Simple Title' },
        },
      },
    };

    const res = evaluatePolicy(missingReqBp, customPolicy);
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'required-element-missing')).toBe(true);
  });

  it('flags disallowed action prefixes in flow', () => {
    const actionViolatingBp: Blueprint = {
      ...cleanBlueprint,
      flow: {
        onPrimaryCta: 'shell:rm-rf' as unknown as `navigate:${string}`,
      },
    };

    const res = evaluatePolicy(actionViolatingBp, customPolicy);
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'disallowed-action')).toBe(true);
  });
});
