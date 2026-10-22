export interface RegionalPolicy {
  /** Enforce EU GDPR sovereign processing boundaries */
  enforceEuDataBoundary: boolean;
  /** Primary endpoint region for EU visitors */
  euRegion: string;
  /** Primary endpoint region for Global/US visitors */
  globalRegion: string;
  /** Strict sovereignty: reject requests if EU model endpoint is unavailable */
  strictSovereignty?: boolean;
}

export const DEFAULT_REGIONAL_POLICY: RegionalPolicy = {
  enforceEuDataBoundary: true,
  euRegion: 'eu-west-1',
  globalRegion: 'us-east-1',
  strictSovereignty: true,
};

// All 27 EU Member States + EEA + UK (GDPR-equivalent)
export const EU_EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', // EU 27
  'IS', 'LI', 'NO', // EEA
  'GB', // UK GDPR
  'CH', // Switzerland FADP
]);

export interface RegionalResolution {
  isEuVisitor: boolean;
  assignedRegion: string;
  modelRegionHeader: string;
  crossBorderTransferAllowed: boolean;
  complianceNotice: string;
}

/**
 * Checks whether an ISO 3166-1 alpha-2 country code belongs to the EU/EEA/GDPR zone.
 */
export function isEuOrGdprCountry(countryCode?: string): boolean {
  if (!countryCode) return false;
  return EU_EEA_COUNTRIES.has(countryCode.toUpperCase().trim());
}

/**
 * Resolves the compliant data processing boundary for a visitor based on geo IP country.
 */
export function resolveRegionalProcessing(
  countryCode: string | undefined,
  policy: RegionalPolicy = DEFAULT_REGIONAL_POLICY
): RegionalResolution {
  const isEu = isEuOrGdprCountry(countryCode);

  if (isEu && policy.enforceEuDataBoundary) {
    return {
      isEuVisitor: true,
      assignedRegion: policy.euRegion,
      modelRegionHeader: `eu-${policy.euRegion}`,
      crossBorderTransferAllowed: false,
      complianceNotice: 'GDPR Data Sovereignty: Processing restricted strictly to EU/EEA geographic boundaries.',
    };
  }

  return {
    isEuVisitor: false,
    assignedRegion: policy.globalRegion,
    modelRegionHeader: policy.globalRegion,
    crossBorderTransferAllowed: true,
    complianceNotice: 'Standard Global Data Processing.',
  };
}
