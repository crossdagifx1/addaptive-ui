/** Visitor context assembled for the model (privacy-filtered) */
export interface VisitorContext {
  /** Referrer source */
  referrer?: string;
  /** Campaign/UTM parameters */
  campaign?: Record<string, string>;
  /** Device type */
  device: 'mobile' | 'tablet' | 'desktop';
  /** Browser locale */
  locale: string;
  /** Connection speed */
  connectionSpeed?: 'slow' | 'medium' | 'fast';
  /** Whether visitor has been here before */
  returning: boolean;
  /** Accessibility preferences */
  a11yPreferences?: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
  /** Segment key derived from conditions */
  segmentKey: string;
}

/** Builds minimal, privacy-filtered context from signals */
export interface ContextBuilder {
  /** Build context from raw signal data */
  build(signals: Record<string, unknown>): VisitorContext;
}

/**
 * Creates a ContextBuilder that strips raw PII and generates normalized visitor context.
 */
export function createContextBuilder(): ContextBuilder {
  return {
    build(signals: Record<string, unknown>): VisitorContext {
      const rawReferrer = typeof signals['referrer'] === 'string' ? signals['referrer'] : undefined;
      let referrerDomain: string | undefined;
      if (rawReferrer) {
        try {
          const url = new URL(rawReferrer);
          referrerDomain = url.hostname;
        } catch {
          referrerDomain = rawReferrer.split('/')[0];
        }
      }

      // Safe UTM extraction
      const campaign: Record<string, string> = {};
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      for (const k of utmKeys) {
        if (typeof signals[k] === 'string') {
          campaign[k.replace('utm_', '')] = signals[k] as string;
        }
      }

      const device = (signals['device'] as 'mobile' | 'tablet' | 'desktop') || 'desktop';
      const locale = (signals['locale'] as string) || 'en';
      const returning = Boolean(signals['returning']);

      // Build serialized segment key (e.g. "ref:google|device:mobile|ret:false")
      const segmentParts: string[] = [];
      if (campaign['source']) {
        segmentParts.push(`ref:${campaign['source']}`);
      } else if (referrerDomain) {
        segmentParts.push(`ref:${referrerDomain.replace(/\./g, '_')}`);
      }
      segmentParts.push(`device:${device}`);
      segmentParts.push(`lang:${locale.substring(0, 2)}`);
      segmentParts.push(`ret:${returning}`);

      return {
        referrer: referrerDomain,
        campaign: Object.keys(campaign).length > 0 ? campaign : undefined,
        device,
        locale,
        connectionSpeed: signals['connectionSpeed'] as 'slow' | 'medium' | 'fast' | undefined,
        returning,
        a11yPreferences: {
          reducedMotion: Boolean(signals['reducedMotion']),
          highContrast: Boolean(signals['highContrast']),
        },
        segmentKey: segmentParts.join('|'),
      };
    },
  };
}
