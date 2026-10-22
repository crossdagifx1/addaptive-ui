import { describe, it, expect } from 'vitest';
import {
  scrubPIIText,
  scrubPIIObject,
  pseudonymizeVisitorId,
  parseOneTrustConsent,
  parseCookiebotConsent,
  isSignalPermitted,
  isEuOrGdprCountry,
  resolveRegionalProcessing,
  filterExpiredRecords,
} from '../src/index.js';

describe('@aui/privacy', () => {
  describe('PII Scrubber', () => {
    it('redacts email addresses from text', () => {
      const raw = 'Contact founder@enterprise.com or support@example.co.uk for inquiries';
      const scrubbed = scrubPIIText(raw);
      expect(scrubbed).toBe('Contact [EMAIL_REDACTED] or [EMAIL_REDACTED] for inquiries');
    });

    it('redacts telephone numbers and SSNs', () => {
      const raw = 'Call +1 (555) 234-5678 or verify SSN 123-45-6789.';
      const scrubbed = scrubPIIText(raw);
      expect(scrubbed).toContain('[PHONE_REDACTED]');
      expect(scrubbed).toContain('[SSN_REDACTED]');
    });

    it('redacts IPv4 and IPv6 addresses', () => {
      const raw = 'Request originating from 192.168.1.100 and internal proxy 10.0.0.1';
      const scrubbed = scrubPIIText(raw);
      expect(scrubbed).toBe('Request originating from [IP_REDACTED] and internal proxy [IP_REDACTED]');
    });

    it('redacts bearer tokens and API keys', () => {
      const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ae... and sk-ant-api03-abcdef1234567890123456';
      const scrubbed = scrubPIIText(raw);
      expect(scrubbed).toContain('[TOKEN_REDACTED]');
    });

    it('recursively scrubs objects and masks confidential keys', () => {
      const payload = {
        visitor: {
          email: 'alice@domain.org',
          ip: '203.0.113.195',
          password: 'SecretPassword123!',
        },
        metadata: {
          note: 'Call 415-555-0199 promptly',
        },
      };

      const cleaned = scrubPIIObject(payload);
      expect(cleaned.visitor.email).toBe('[EMAIL_REDACTED]');
      expect(cleaned.visitor.ip).toBe('[IP_REDACTED]');
      expect(cleaned.visitor.password).toBe('[CONFIDENTIAL_REDACTED]');
      expect(cleaned.metadata.note).toContain('[PHONE_REDACTED]');
    });

    it('generates consistent pseudonym visitor tokens', () => {
      const salt = 'tenant_salt_xyz';
      const id1 = pseudonymizeVisitorId('user@test.com', salt);
      const id2 = pseudonymizeVisitorId('user@test.com', salt);
      const id3 = pseudonymizeVisitorId('other@test.com', salt);

      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id1.startsWith('anon_')).toBe(true);
    });
  });

  describe('Consent Management', () => {
    it('parses OneTrust cookie groups correctly', () => {
      // C0001 (Strictly Necessary), C0002 (Analytics), C0003 (Functional)
      const oneTrustFull = ',C0001,C0002,C0003,C0004,';
      const state = parseOneTrustConsent(oneTrustFull);
      expect(state.analytics).toBe(true);
      expect(state.personalization).toBe(true);
      expect(state.marketing).toBe(true);

      const oneTrustEssentialOnly = ',C0001,';
      const deniedState = parseOneTrustConsent(oneTrustEssentialOnly);
      expect(deniedState.analytics).toBe(false);
      expect(deniedState.personalization).toBe(false);
      expect(deniedState.marketing).toBe(false);
    });

    it('parses Cookiebot consent object', () => {
      const state = parseCookiebotConsent({
        necessary: true,
        preferences: true,
        statistics: false,
        marketing: false,
      });

      expect(state.personalization).toBe(true);
      expect(state.analytics).toBe(false);
      expect(state.marketing).toBe(false);
    });

    it('governs signal collection based on granular consent state', () => {
      const partialConsent = {
        functional: true,
        analytics: true,
        personalization: false,
        marketing: false,
      };

      expect(isSignalPermitted(partialConsent, 'scroll')).toBe(true);
      expect(isSignalPermitted(partialConsent, 'click')).toBe(true);
      expect(isSignalPermitted(partialConsent, 'explicit_prompt')).toBe(false);
      expect(isSignalPermitted(partialConsent, 'campaign')).toBe(false);
    });
  });

  describe('Regional Processing & Data Boundaries', () => {
    it('identifies EU, EEA, and UK GDPR countries', () => {
      expect(isEuOrGdprCountry('DE')).toBe(true);
      expect(isEuOrGdprCountry('FR')).toBe(true);
      expect(isEuOrGdprCountry('GB')).toBe(true);
      expect(isEuOrGdprCountry('NO')).toBe(true);
      expect(isEuOrGdprCountry('US')).toBe(false);
      expect(isEuOrGdprCountry('JP')).toBe(false);
    });

    it('enforces EU-only routing for EU visitors under GDPR policy', () => {
      const euRes = resolveRegionalProcessing('DE');
      expect(euRes.isEuVisitor).toBe(true);
      expect(euRes.assignedRegion).toBe('eu-west-1');
      expect(euRes.crossBorderTransferAllowed).toBe(false);

      const usRes = resolveRegionalProcessing('US');
      expect(usRes.isEuVisitor).toBe(false);
      expect(usRes.assignedRegion).toBe('us-east-1');
      expect(usRes.crossBorderTransferAllowed).toBe(true);
    });
  });

  describe('Data Retention & Right to be Forgotten', () => {
    it('filters expired events based on retention window', () => {
      const now = Date.now();
      const records = [
        { id: 'recent_1', timestamp: new Date(now - 10 * 86400000).toISOString() }, // 10 days ago
        { id: 'recent_2', timestamp: new Date(now - 45 * 86400000).toISOString() }, // 45 days ago
        { id: 'old_1', timestamp: new Date(now - 120 * 86400000).toISOString() },   // 120 days ago (> 90)
      ];

      const { valid, expired } = filterExpiredRecords(records, 90);
      expect(valid.length).toBe(2);
      expect(expired.length).toBe(1);
      expect(expired[0].id).toBe('old_1');
    });
  });
});
