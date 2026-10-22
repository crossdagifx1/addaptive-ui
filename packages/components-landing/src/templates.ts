import type { Blueprint } from '@aui/schema';
import { SCHEMA_VERSION } from '@aui/schema';

/**
 * Standard default landing page blueprint.
 * Serves as the holdout / fallback blueprint for every landing page.
 */
export const defaultLandingBlueprint: Blueprint = {
  schemaVersion: SCHEMA_VERSION,
  blueprintId: 'bp_landing_default',
  pageId: 'landing-home',
  segment: 'default',
  tokens: {
    'color.primary': '#00e5ff',
    'color.secondary': '#d4af37',
    'color.background': '#0a0a0f',
    'color.surface': '#111118',
    'color.text': '#f5f5f5',
    'font.heading': 'system-ui, -apple-system, sans-serif',
    'font.body': 'system-ui, -apple-system, sans-serif',
    density: 'comfortable',
  },
  layout: {
    type: 'stack',
    sections: ['banner', 'nav', 'hero', 'logos', 'features', 'testimonials', 'pricing', 'faq', 'cta', 'footer'],
    gap: '32px',
  },
  components: {
    banner: {
      type: 'Banner',
      props: {
        text: '🚀 Experience the power of model-agnostic Adaptive UI',
        action: { label: 'Explore Docs', href: '/docs' },
      },
    },
    nav: {
      type: 'Nav',
      locked: true,
      props: {
        logo: { text: 'AUI Engine' },
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'FAQ', href: '#faq' },
        ],
        cta: { label: 'Get Started', action: 'navigate:/signup' },
      },
    },
    hero: {
      type: 'Hero',
      props: {
        headline: 'Safe, Model-Agnostic Adaptive UI for Modern Websites',
        subheadline:
          'Personalize landing pages, onboarding, and experiences safely per visitor using any AI model — with 100% locked-zone guarantees.',
        primaryCta: { label: 'Start Free Trial', action: 'navigate:/signup' },
        secondaryCta: { label: 'View Live Demo', action: 'scroll:#features' },
      },
    },
    logos: {
      type: 'LogoCloud',
      props: {
        caption: 'POWERING NEXT-GENERATION PERSONALIZED EXPERIENCES',
        logos: [
          { text: 'Anthropic' },
          { text: 'OpenAI' },
          { text: 'Google Cloud' },
          { text: 'Cloudflare' },
          { text: 'Vercel' },
        ],
      },
    },
    features: {
      type: 'FeatureGrid',
      props: {
        items: [
          {
            icon: '🛡️',
            title: '100% Safe Execution',
            text: 'UI is data, never executable code. Models output structured JSON blueprints validated through 9 security stages.',
          },
          {
            icon: '⚡',
            title: 'Zero Latency Impact',
            text: 'Never blocks first paint. Variants are pre-generated and cached per segment, with instant default fallback.',
          },
          {
            icon: '🔒',
            title: 'Locked Zones Protection',
            text: 'Guaranteed protection for pricing, legal disclaimers, checkout forms, and compliance elements.',
          },
          {
            icon: '🧠',
            title: 'Any AI Model',
            text: 'Plug into Claude, GPT-4o, Gemini, or local models (Ollama/vLLM) through one unified model adapter.',
          },
          {
            icon: '📈',
            title: 'Measured Business Lift',
            text: 'Built-in holdout groups and statistical attribution ensure you can prove conversion lift with confidence.',
          },
          {
            icon: '🌐',
            title: 'Framework Agnostic',
            text: 'Works everywhere: React, Vue, Svelte, or drop-in vanilla HTML script tag.',
          },
        ],
      },
    },
    testimonials: {
      type: 'Testimonials',
      props: {
        quotes: [
          {
            name: 'Sarah Chen',
            role: 'Head of Growth, ScaleFast',
            text: 'AUI lifted our paid acquisition conversion by 28% without our engineering team having to manually create dozens of landing page variations.',
          },
          {
            name: 'Marcus Vance',
            role: 'VP Engineering, FinCloud',
            text: 'The locked-zone guarantees and policy engine gave our legal and compliance teams complete peace of mind.',
          },
        ],
      },
    },
    pricing: {
      type: 'PricingTable',
      locked: true,
      props: {
        plans: [
          {
            name: 'Starter',
            price: '$0',
            period: '/month',
            features: ['1 site', '10,000 visitors/mo', '100 generated variants', 'Community support'],
            cta: 'Start Free',
          },
          {
            name: 'Pro',
            price: '$149',
            period: '/month',
            popular: true,
            features: [
              '5 sites',
              '100,000 visitors/mo',
              'Unlimited variants',
              'Model routing & cost caps',
              'Visual diff approvals',
            ],
            cta: 'Start Pro Trial',
          },
          {
            name: 'Enterprise',
            price: '$899',
            period: '/month',
            features: [
              'Unlimited sites & traffic',
              'Bring your own model keys',
              'Holdout group experimentation',
              'Dedicated support & SLA',
            ],
            cta: 'Contact Sales',
          },
        ],
      },
    },
    faq: {
      type: 'FAQ',
      props: {
        items: [
          {
            q: 'Can the AI break our website or change our pricing?',
            a: 'No. The AI never ships executable code to the browser. All changes are governed by locked zones, schema validation, and strict policy rules.',
          },
          {
            q: 'Does this slow down page load or harm SEO?',
            a: 'No. The model is never on the critical path of first paint. Search crawlers always receive canonical, pre-rendered HTML, and variants are cached at the edge.',
          },
          {
            q: 'Which AI models are supported?',
            a: 'AUI Engine works with OpenAI, Anthropic, Google, and open-source models via Ollama or any OpenAI-compatible API.',
          },
        ],
      },
    },
    cta: {
      type: 'CTA',
      props: {
        headline: 'Start Delivering Adaptive Experiences in 15 Minutes',
        button: { label: 'Get Started Now', action: 'navigate:/signup' },
      },
    },
    footer: {
      type: 'LegalFooter',
      locked: true,
      props: {
        text: '© 2026 AUI Engine Inc. All rights reserved.',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Security & Compliance', href: '/security' },
        ],
      },
    },
  },
  flow: {
    onPrimaryCta: 'navigate:/signup',
  },
  meta: {
    generatedBy: 'system:default',
    reasoning: 'Standard canonical default landing page blueprint',
    createdAt: new Date().toISOString(),
    status: 'approved',
  },
};
