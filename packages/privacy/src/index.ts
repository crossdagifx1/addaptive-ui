/**
 * @aui/privacy — Enterprise privacy, PII scrubbing, consent management, and regional processing
 *
 * @packageDocumentation
 */

export {
  type ScrubOptions,
  scrubPIIText,
  scrubPIIObject,
  pseudonymizeVisitorId,
} from './pii.js';

export {
  type ConsentState,
  DEFAULT_DENIED_CONSENT,
  DEFAULT_GRANTED_CONSENT,
  parseOneTrustConsent,
  parseCookiebotConsent,
  isSignalPermitted,
} from './consent.js';

export {
  type RegionalPolicy,
  type RegionalResolution,
  DEFAULT_REGIONAL_POLICY,
  EU_EEA_COUNTRIES,
  isEuOrGdprCountry,
  resolveRegionalProcessing,
} from './regional.js';

export {
  type DataRetentionPolicy,
  type RetentionPurgeResult,
  DEFAULT_RETENTION_POLICY,
  calculateRetentionCutoff,
  filterExpiredRecords,
} from './retention.js';
