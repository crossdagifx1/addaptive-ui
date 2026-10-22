export interface DataRetentionPolicy {
  /** Maximum days to retain visitor signals and analytics events */
  maxEventAgeDays: number;
  /** Whether to automatically purge all visitor records upon consent withdrawal */
  autoPurgeOnConsentWithdrawal: boolean;
}

export const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  maxEventAgeDays: 90,
  autoPurgeOnConsentWithdrawal: true,
};

export interface RetentionPurgeResult {
  recordsPurged: number;
  cutoffIso: string;
  success: boolean;
}

/**
 * Calculates the ISO timestamp cutoff for a given retention period in days.
 */
export function calculateRetentionCutoff(maxAgeDays: number): string {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

/**
 * Filter an array of timestamped records in-memory or produce SQL query params
 * for GDPR Right to be Forgotten compliance.
 */
export function filterExpiredRecords<T extends { timestamp?: string; createdAt?: string }>(
  records: T[],
  maxAgeDays: number
): { valid: T[]; expired: T[] } {
  const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const valid: T[] = [];
  const expired: T[] = [];

  for (const record of records) {
    const timeStr = record.timestamp || record.createdAt;
    const itemTime = timeStr ? new Date(timeStr).getTime() : 0;
    if (itemTime >= cutoffTime) {
      valid.push(record);
    } else {
      expired.push(record);
    }
  }

  return { valid, expired };
}
