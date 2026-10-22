import type { Policy } from './types.js';

/**
 * Sensible default policy — ships with the engine.
 * Customers customize from here.
 */
export const DEFAULT_POLICY: Policy = {
  id: 'default',
  version: '1.0',
  locked: ['PricingTable', 'LeadForm', 'LegalFooter'],
  bannedPhrases: ['guaranteed results', 'limited time only', 'act now or miss out'],
  requiredElements: ['privacy-link', 'cookie-consent'],
  allowedActions: ['navigate', 'scroll', 'open-modal'],
  maxSectionChanges: 3,
  a11y: {
    minContrast: 4.5,
    requireAltText: true,
  },
  rules: [],
};
