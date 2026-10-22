import { describe, it, expect } from 'vitest';
import type { Blueprint, ComponentRegistration } from '@aui/schema';
import { validateBlueprint, type ValidatorConfig } from '../src/index.js';

describe('@aui/validator', () => {
  const sampleRegistrations: ComponentRegistration[] = [
    {
      type: 'Hero',
      displayName: 'Hero',
      description: 'Hero block',
      propsSchema: { type: 'object' },
      permissions: {
        editable: ['headline', 'subheadline'],
        readonly: ['id'],
        reorderable: true,
        removable: false,
        variantChangeable: true,
      },
      a11yRules: { requireAltText: true },
      variants: ['centered', 'split'],
      lockedByDefault: false,
    },
    {
      type: 'PricingTable',
      displayName: 'Pricing Table',
      description: 'Pricing plans',
      propsSchema: { type: 'object' },
      permissions: {
        editable: [],
        readonly: ['plans'],
        reorderable: false,
        removable: false,
        variantChangeable: false,
      },
      a11yRules: {},
      lockedByDefault: true,
    },
  ];

  const baseConfig: ValidatorConfig = {
    componentRegistry: sampleRegistrations,
    lockedZones: ['PricingTable'],
    contentPolicy: {
      bannedPhrases: ['guaranteed results', 'limited time only', 'free cash'],
      requiredElements: ['privacy-link'],
      allowedActions: ['navigate', 'scroll', 'open-modal'],
    },
    accessibility: {
      minContrast: 4.5,
      requireAltText: true,
      requireHeadingOrder: true,
    },
    sizeBudget: {
      maxSections: 5,
    },
    diffLimits: {
      maxSectionChanges: 2,
    },
  };

  const validBlueprint: Blueprint = {
    schemaVersion: '1.0',
    blueprintId: 'bp_val_01',
    pageId: 'landing-1',
    segment: 'default',
    layout: {
      type: 'stack',
      sections: ['hero', 'pricing'],
    },
    components: {
      hero: {
        type: 'Hero',
        variant: 'centered',
        props: {
          headline: 'Next Gen Experience',
          subheadline: 'Privacy-link included below.',
        },
      },
      pricing: {
        type: 'PricingTable',
        locked: true,
        props: {
          plans: [{ name: 'Starter', price: '$0' }],
        },
      },
    },
    flow: {
      onPrimaryCta: 'navigate:/signup',
    },
    meta: {
      generatedBy: 'test',
      createdAt: new Date().toISOString(),
    },
  };

  it('passes a fully conforming blueprint through all 9 stages', () => {
    const res = validateBlueprint(validBlueprint, baseConfig);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.stagesRun).toEqual([
      'schema',
      'component',
      'permission',
      'locked-zone',
      'content-policy',
      'link-action',
      'accessibility',
      'size-budget',
      'diff-size',
    ]);
  });

  it('rejects unregistered component types in stage 2', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        unregistered: {
          type: 'SecretCryptominerWidget',
        },
      },
      layout: {
        type: 'stack',
        sections: ['hero', 'pricing', 'unregistered'],
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'component' && e.code === 'UNREGISTERED_COMPONENT')).toBe(true);
  });

  it('catches locked zone tampering against default blueprint in stage 4', () => {
    const defaultBp = validBlueprint;
    const tamperedBp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        pricing: {
          type: 'PricingTable',
          locked: true,
          props: {
            plans: [{ name: 'Hacked Price', price: '$0.01' }], // Tampered!
          },
        },
      },
    };

    const res = validateBlueprint(tamperedBp, baseConfig, defaultBp);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'locked-zone' && e.code === 'LOCKED_ZONE_MUTATED')).toBe(true);
  });

  it('detects banned marketing phrases in stage 5', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        hero: {
          type: 'Hero',
          props: {
            headline: 'Get guaranteed results or get free cash now!',
          },
        },
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'content-policy' && e.code === 'BANNED_PHRASE')).toBe(true);
  });

  it('rejects disallowed action schemes like javascript: or eval: in stage 6', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      flow: {
        onPrimaryCta: 'javascript:alert(1)' as unknown as `navigate:${string}`,
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'link-action')).toBe(true);
  });

  it('enforces image alt requirement under accessibility checks in stage 7', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        hero: {
          type: 'Hero',
          props: {
            headline: 'Hello',
            image: 'https://example.com/banner.png',
            // Missing alt attribute!
          },
        },
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'accessibility' && e.code === 'MISSING_IMAGE_ALT')).toBe(true);
  });

  it('rejects blueprints exceeding size budgets in stage 8', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      layout: {
        type: 'stack',
        sections: ['s1', 's2', 's3', 's4', 's5', 's6'], // 6 sections > limit of 5
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'size-budget' && e.code === 'MAX_SECTIONS_EXCEEDED')).toBe(true);
  });

  it('detects Unicode homoglyph evasion attempts for banned phrases', () => {
    // Uses Cyrillic 'а' and zero-width spaces in "guаrаnteed"
    const bp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        hero: {
          type: 'Hero',
          props: {
            headline: 'We offer gu\u0430r\u0430nteed results for everyone',
          },
        },
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'content-policy' && e.code === 'BANNED_PHRASE')).toBe(true);
  });

  it('detects script injection and executable markup in component props', () => {
    const bp: Blueprint = {
      ...validBlueprint,
      components: {
        ...validBlueprint.components,
        hero: {
          type: 'Hero',
          props: {
            headline: 'Safe headline <script>alert("hacked")</script>',
          },
        },
      },
    };

    const res = validateBlueprint(bp, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.stage === 'content-policy' && e.code === 'SCRIPT_INJECTION_DETECTED')).toBe(true);
  });
});

