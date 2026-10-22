import { describe, it, expect } from 'vitest';
import {
  BlueprintSchema,
  SCHEMA_VERSION,
  ComponentRegistrationSchema,
  LayoutSchema,
  type Blueprint,
} from '../src/index.js';

describe('@aui/schema', () => {
  it('has valid schema version', () => {
    expect(SCHEMA_VERSION).toBe('1.0');
  });

  it('validates a complete, well-formed blueprint', () => {
    const blueprint: Blueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp_test_1',
      pageId: 'landing-test',
      segment: 'ref:google-ads|device:mobile',
      tokens: {
        'color.primary': '#00e5ff',
        'color.surface': '#111118',
        density: 'comfortable',
      },
      layout: {
        type: 'stack',
        sections: ['hero', 'pricing'],
        gap: '24px',
      },
      components: {
        hero: {
          type: 'Hero',
          props: {
            headline: 'Transform your website',
            subheadline: 'Personalize per visitor safely',
          },
        },
        pricing: {
          type: 'PricingTable',
          locked: true,
          props: {
            plans: [{ name: 'Pro', price: '$99' }],
          },
        },
      },
      flow: {
        onPrimaryCta: 'navigate:/signup',
      },
      meta: {
        generatedBy: 'model:test',
        createdAt: new Date().toISOString(),
      },
    };

    const parsed = BlueprintSchema.safeParse(blueprint);
    expect(parsed.success).toBe(true);
  });

  it('rejects blueprints missing required layout or components', () => {
    const invalidBlueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp_invalid',
      pageId: 'home',
      segment: 'default',
      // missing layout and components
      meta: {
        generatedBy: 'test',
        createdAt: new Date().toISOString(),
      },
    };

    const parsed = BlueprintSchema.safeParse(invalidBlueprint);
    expect(parsed.success).toBe(false);
  });

  it('validates a component registration schema', () => {
    const registration = {
      type: 'Hero',
      displayName: 'Hero Section',
      description: 'Main hero block',
      propsSchema: {
        type: 'object',
        properties: { headline: { type: 'string' } },
      },
      permissions: {
        editable: ['headline'],
        readonly: ['id'],
        reorderable: true,
        removable: false,
        variantChangeable: true,
      },
      a11yRules: {
        minContrast: 4.5,
        requireAltText: true,
      },
      variants: ['centered', 'split'],
      lockedByDefault: false,
    };

    const parsed = ComponentRegistrationSchema.safeParse(registration);
    expect(parsed.success).toBe(true);
  });

  it('validates grid layouts with columns', () => {
    const layout = {
      type: 'grid',
      sections: ['card1', 'card2', 'card3'],
      columns: 3,
      gap: '16px',
    };

    const parsed = LayoutSchema.safeParse(layout);
    expect(parsed.success).toBe(true);
  });
});
