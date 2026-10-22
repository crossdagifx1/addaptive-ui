export interface ConsentState {
  /** Consent to personalize UI, adapt content, and run AI decisioning */
  personalization: boolean;
  /** Consent to collect behavioral analytics, scroll depth, dwell time, and clicks */
  analytics: boolean;
  /** Functional essentials (always true for essential site delivery) */
  functional: boolean;
  /** Marketing & ad attribution (UTM parameter storage, retargeting) */
  marketing: boolean;
  /** Provider source */
  source?: 'onetrust' | 'cookiebot' | 'tcf_v2' | 'custom' | 'default';
  /** Timestamp of consent capture */
  updatedAt?: string;
}

export const DEFAULT_DENIED_CONSENT: ConsentState = {
  personalization: false,
  analytics: false,
  functional: true,
  marketing: false,
  source: 'default',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_GRANTED_CONSENT: ConsentState = {
  personalization: true,
  analytics: true,
  functional: true,
  marketing: true,
  source: 'default',
  updatedAt: new Date().toISOString(),
};

/**
 * Parses OneTrust active groups cookie/string format (e.g. ",C0001,C0002,C0003,C0004,").
 * C0001 = Necessary
 * C0002 = Performance / Analytics
 * C0003 = Functional
 * C0004 = Targeting / Marketing
 */
export function parseOneTrustConsent(groupsString?: string): ConsentState {
  if (!groupsString || typeof groupsString !== 'string') {
    return { ...DEFAULT_DENIED_CONSENT, source: 'onetrust' };
  }

  const groups = new Set(groupsString.split(',').map((g) => g.trim().toUpperCase()));

  return {
    functional: true,
    analytics: groups.has('C0002'),
    personalization: groups.has('C0003') || groups.has('C0002'),
    marketing: groups.has('C0004'),
    source: 'onetrust',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Parses Cookiebot JavaScript consent object (e.g. window.Cookiebot.consent).
 */
export function parseCookiebotConsent(cookiebotConsent?: {
  necessary?: boolean;
  preferences?: boolean;
  statistics?: boolean;
  marketing?: boolean;
}): ConsentState {
  if (!cookiebotConsent || typeof cookiebotConsent !== 'object') {
    return { ...DEFAULT_DENIED_CONSENT, source: 'cookiebot' };
  }

  return {
    functional: true,
    analytics: Boolean(cookiebotConsent.statistics),
    personalization: Boolean(cookiebotConsent.preferences || cookiebotConsent.statistics),
    marketing: Boolean(cookiebotConsent.marketing),
    source: 'cookiebot',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates whether signal collection is permitted under current consent.
 */
export function isSignalPermitted(consent: ConsentState, signalType: string): boolean {
  if (!consent) return false;

  const lower = signalType.toLowerCase();

  // Explicit user prompts or UI mode switches require personalization consent
  if (lower === 'explicit_prompt' || lower === 'intent') {
    return consent.personalization;
  }

  // Behavioral signals require analytics consent
  if (['click', 'scroll', 'dwell', 'exit_intent', 'rage_click', 'view'].includes(lower)) {
    return consent.analytics;
  }

  // Campaign & UTM attribution require marketing consent
  if (lower === 'utm' || lower === 'campaign' || lower === 'ad_referrer') {
    return consent.marketing;
  }

  return consent.functional;
}
