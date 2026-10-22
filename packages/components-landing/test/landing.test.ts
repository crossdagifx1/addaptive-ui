// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { BlueprintSchema } from '@aui/schema';
import { createComponentRegistry } from '@aui/core';
import {
  landingComponentRegistrations,
  landingRenderers,
  registerLandingComponents,
  defaultLandingBlueprint,
} from '../src/index.js';

describe('@aui/components-landing', () => {
  it('includes all 11 Appendix A landing components in registrations', () => {
    const expectedTypes = [
      'Nav',
      'Hero',
      'LogoCloud',
      'FeatureGrid',
      'Testimonials',
      'PricingTable',
      'FAQ',
      'CTA',
      'LeadForm',
      'LegalFooter',
      'Banner',
    ];

    const registeredTypes = landingComponentRegistrations.map((r) => r.type);
    for (const exp of expectedTypes) {
      expect(registeredTypes).toContain(exp);
    }
  });

  it('correctly sets lockedByDefault according to Appendix A', () => {
    const getReg = (type: string) => landingComponentRegistrations.find((r) => r.type === type);

    expect(getReg('PricingTable')?.lockedByDefault).toBe(true);
    expect(getReg('LeadForm')?.lockedByDefault).toBe(true);
    expect(getReg('LegalFooter')?.lockedByDefault).toBe(true);
    expect(getReg('Nav')?.lockedByDefault).toBe(true);

    expect(getReg('Hero')?.lockedByDefault).toBe(false);
    expect(getReg('FeatureGrid')?.lockedByDefault).toBe(false);
    expect(getReg('CTA')?.lockedByDefault).toBe(false);
  });

  it('registers all 11 renderers into an AUI ComponentRegistry', () => {
    const registry = createComponentRegistry();
    registerLandingComponents(registry);

    expect(registry.list()).toHaveLength(11);
    expect(registry.has('Hero')).toBe(true);
    expect(registry.has('PricingTable')).toBe(true);
    expect(registry.has('LegalFooter')).toBe(true);
  });

  it('has a 100% valid defaultLandingBlueprint conforming to BlueprintSchema', () => {
    const parsed = BlueprintSchema.safeParse(defaultLandingBlueprint);
    expect(parsed.success).toBe(true);
    expect(defaultLandingBlueprint.layout.sections.length).toBeGreaterThanOrEqual(8);
  });

  it('renders modern HTML for Hero and PricingTable without errors', () => {
    const heroEl = document.createElement('div');
    landingRenderers['Hero']!(
      {
        headline: 'Instant Adaptive UI',
        subheadline: 'Personalize per visitor safely',
        primaryCta: { label: 'Start Now', action: 'navigate:/start' },
      },
      heroEl,
      'centered',
    );

    expect(heroEl.innerHTML).toContain('Instant Adaptive UI');
    expect(heroEl.innerHTML).toContain('Start Now');

    const pricingEl = document.createElement('div');
    landingRenderers['PricingTable']!(
      {
        plans: [
          {
            name: 'Growth',
            price: '$49',
            features: ['10,000 visitors', 'A/B testing'],
          },
        ],
      },
      pricingEl,
    );

    expect(pricingEl.innerHTML).toContain('Growth');
    expect(pricingEl.innerHTML).toContain('$49');
    expect(pricingEl.innerHTML).toContain('A/B testing');
  });
});
