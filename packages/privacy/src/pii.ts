import * as crypto from 'node:crypto';

export interface ScrubOptions {
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskCreditCards?: boolean;
  maskSsn?: boolean;
  maskIps?: boolean;
  maskTokens?: boolean;
  customRedactNotice?: string;
}

const DEFAULT_OPTIONS: Required<ScrubOptions> = {
  maskEmails: true,
  maskPhones: true,
  maskCreditCards: true,
  maskSsn: true,
  maskIps: true,
  maskTokens: true,
  customRedactNotice: '[REDACTED]',
};

// Common high-precision PII regexes
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g;
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
const TOKEN_REGEX = /(?:Bearer\s+[A-Za-z0-9_\-.]+|sk-[A-Za-z0-9]{20,}|api[_-]?key[:=]\s*[A-Za-z0-9_\-.]{16,})/gi;

const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'ssn',
  'creditcard',
  'cardnumber',
  'cvv',
]);

/**
 * Scans a string and scrubs all detected personally identifiable information (PII).
 */
export function scrubPIIText(text: string, options: ScrubOptions = {}): string {
  if (!text || typeof text !== 'string') return text;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text;

  if (opts.maskTokens) {
    result = result.replace(TOKEN_REGEX, '[TOKEN_REDACTED]');
  }
  if (opts.maskCreditCards) {
    result = result.replace(CREDIT_CARD_REGEX, '[CREDIT_CARD_REDACTED]');
  }
  if (opts.maskSsn) {
    result = result.replace(SSN_REGEX, '[SSN_REDACTED]');
  }
  if (opts.maskEmails) {
    result = result.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  }
  if (opts.maskPhones) {
    result = result.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  }
  if (opts.maskIps) {
    result = result.replace(IPV4_REGEX, '[IP_REDACTED]');
    result = result.replace(IPV6_REGEX, '[IP_REDACTED]');
  }

  return result;
}

/**
 * Recursively scrubs all PII from any structured data object or array
 * before it is used as model context.
 */
export function scrubPIIObject<T>(input: T, options: ScrubOptions = {}): T {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    return scrubPIIText(input, options) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => scrubPIIObject(item, options)) as unknown as T;
  }

  if (typeof input === 'object') {
    const output: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEY_NAMES.has(lowerKey)) {
        output[key] = '[CONFIDENTIAL_REDACTED]';
      } else {
        output[key] = scrubPIIObject(val, options);
      }
    }
    return output as T;
  }

  return input;
}

/**
 * Generates an irreversible cryptographic pseudonym for a visitor identifier
 * using SHA-256 with a tenant-scoped salt.
 */
export function pseudonymizeVisitorId(visitorId: string, salt: string): string {
  const hash = crypto.createHmac('sha256', salt);
  hash.update(visitorId, 'utf8');
  return `anon_${hash.digest('hex').substring(0, 16)}`;
}
