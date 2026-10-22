import type { ComponentRegistration } from '@aui/schema';

/**
 * Landing Page Pack v1 component registrations.
 * Matches Appendix A of the plan.
 */
export const landingComponentRegistrations: ComponentRegistration[] = [
  {
    type: 'Nav',
    displayName: 'Navigation Bar',
    description: 'Top navigation with logo, links, and CTA',
    propsSchema: {
      type: 'object',
      properties: {
        links: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } } } },
        logo: { type: 'object', properties: { src: { type: 'string' }, alt: { type: 'string' } } },
        cta: { type: 'object', properties: { label: { type: 'string' }, action: { type: 'string' } } },
      },
    },
    permissions: { editable: ['links'], readonly: ['logo'], reorderable: false, removable: false, variantChangeable: true },
    a11yRules: { requiredLabels: ['navigation'], requireAltText: true },
    variants: ['transparent', 'solid', 'floating'],
    lockedByDefault: true,
    category: 'navigation',
  },
  {
    type: 'Hero',
    displayName: 'Hero Section',
    description: 'Full-width hero with headline, subheadline, CTA, and optional media',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subheadline: { type: 'string' },
        primaryCta: { type: 'object', properties: { label: { type: 'string' }, action: { type: 'string' } } },
        secondaryCta: { type: 'object', properties: { label: { type: 'string' }, action: { type: 'string' } } },
        media: { type: 'object', properties: { src: { type: 'string' }, alt: { type: 'string' }, type: { type: 'string', enum: ['image', 'video', 'illustration'] } } },
      },
    },
    permissions: { editable: ['headline', 'subheadline', 'primaryCta.label', 'secondaryCta.label'], readonly: ['primaryCta.action'], reorderable: false, removable: false, variantChangeable: true },
    a11yRules: { headingLevel: 1, requireAltText: true, minContrast: 4.5 },
    variants: ['centered', 'split', 'media-bg', 'minimal'],
    lockedByDefault: false,
    category: 'hero',
  },
  {
    type: 'LogoCloud',
    displayName: 'Logo Cloud',
    description: 'Social proof — row of partner/customer logos',
    propsSchema: {
      type: 'object',
      properties: {
        logos: { type: 'array', items: { type: 'object', properties: { src: { type: 'string' }, alt: { type: 'string' }, href: { type: 'string' } } } },
        caption: { type: 'string' },
      },
    },
    permissions: { editable: ['caption'], readonly: ['logos'], reorderable: true, removable: true, variantChangeable: true },
    a11yRules: { requireAltText: true },
    variants: ['scroll', 'grid', 'minimal'],
    lockedByDefault: false,
    category: 'social-proof',
  },
  {
    type: 'FeatureGrid',
    displayName: 'Feature Grid',
    description: 'Grid of feature cards with icons, titles, and descriptions',
    propsSchema: {
      type: 'object',
      properties: {
        heading: { type: 'string' },
        items: { type: 'array', items: { type: 'object', properties: { icon: { type: 'string' }, title: { type: 'string' }, text: { type: 'string' } } } },
        columns: { type: 'number', enum: [2, 3, 4] },
      },
    },
    permissions: { editable: ['heading', 'items.*.title', 'items.*.text'], readonly: ['items.*.icon'], reorderable: true, removable: true, variantChangeable: true },
    a11yRules: { headingLevel: 2 },
    variants: ['cards', 'icons-left', 'minimal', 'alternating'],
    lockedByDefault: false,
    category: 'features',
  },
  {
    type: 'Testimonials',
    displayName: 'Testimonials',
    description: 'Customer quotes with name, role, and avatar',
    propsSchema: {
      type: 'object',
      properties: {
        heading: { type: 'string' },
        quotes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, text: { type: 'string' }, avatar: { type: 'string' } } } },
      },
    },
    permissions: { editable: [], readonly: ['quotes.*.text', 'quotes.*.name', 'quotes.*.role'], reorderable: true, removable: false, variantChangeable: true },
    a11yRules: {},
    variants: ['carousel', 'grid', 'single-featured'],
    lockedByDefault: false,
    category: 'social-proof',
  },
  {
    type: 'PricingTable',
    displayName: 'Pricing Table',
    description: 'Pricing plans with features and CTAs',
    propsSchema: {
      type: 'object',
      properties: {
        plans: { type: 'array', items: { type: 'object' } },
      },
    },
    permissions: { editable: [], readonly: ['plans'], reorderable: false, removable: false, variantChangeable: false },
    a11yRules: { headingLevel: 2 },
    variants: ['cards', 'comparison-table'],
    lockedByDefault: true,
    category: 'pricing',
  },
  {
    type: 'FAQ',
    displayName: 'FAQ Section',
    description: 'Frequently asked questions with expandable answers',
    propsSchema: {
      type: 'object',
      properties: {
        heading: { type: 'string' },
        items: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } } } },
      },
    },
    permissions: { editable: ['heading'], readonly: ['items.*.q', 'items.*.a'], reorderable: true, removable: true, variantChangeable: true },
    a11yRules: { headingLevel: 2 },
    variants: ['accordion', 'two-column', 'simple'],
    lockedByDefault: false,
    category: 'content',
  },
  {
    type: 'CTA',
    displayName: 'Call to Action',
    description: 'Standalone CTA section with headline and button',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subheadline: { type: 'string' },
        button: { type: 'object', properties: { label: { type: 'string' }, action: { type: 'string' } } },
      },
    },
    permissions: { editable: ['headline', 'subheadline', 'button.label'], readonly: ['button.action'], reorderable: true, removable: true, variantChangeable: true },
    a11yRules: { headingLevel: 2 },
    variants: ['banner', 'centered', 'split', 'gradient'],
    lockedByDefault: false,
    category: 'conversion',
  },
  {
    type: 'LeadForm',
    displayName: 'Lead Capture Form',
    description: 'Form for collecting leads with configurable fields',
    propsSchema: {
      type: 'object',
      properties: {
        fields: { type: 'array', items: { type: 'object' } },
        consent: { type: 'object' },
        submitLabel: { type: 'string' },
      },
    },
    permissions: { editable: [], readonly: ['fields', 'consent'], reorderable: false, removable: false, variantChangeable: false },
    a11yRules: { requiredLabels: ['form'], focusBehavior: 'flow' },
    lockedByDefault: true,
    category: 'conversion',
  },
  {
    type: 'LegalFooter',
    displayName: 'Legal Footer',
    description: 'Footer with legal links and copyright',
    propsSchema: {
      type: 'object',
      properties: {
        links: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } } } },
        text: { type: 'string' },
      },
    },
    permissions: { editable: [], readonly: ['links', 'text'], reorderable: false, removable: false, variantChangeable: false },
    a11yRules: { requiredLabels: ['contentinfo'] },
    lockedByDefault: true,
    category: 'legal',
  },
  {
    type: 'Banner',
    displayName: 'Banner',
    description: 'Announcement or promotional banner',
    propsSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        action: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } } },
        dismissible: { type: 'boolean' },
      },
    },
    permissions: { editable: ['text', 'action.label'], readonly: ['action.href'], reorderable: true, removable: true, variantChangeable: true },
    a11yRules: {},
    variants: ['top-bar', 'floating', 'inline'],
    lockedByDefault: false,
    category: 'content',
  },
];
