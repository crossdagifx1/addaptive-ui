import type { ExperimentStats, SignificanceResult } from './types.js';

/**
 * Standard normal cumulative distribution function (CDF) approximation.
 * Accurate to within 7.5e-8.
 */
export function normalCdf(x: number): number {
  if (x < 0) return 1 - normalCdf(-x);

  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.3989422804014327; // 1 / sqrt(2 * PI)

  const t = 1.0 / (1.0 + p * x);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  return 1.0 - c * Math.exp(-0.5 * x * x) * poly;
}

/**
 * Calculates two-proportion z-test significance and confidence intervals.
 */
export function calculateSignificance(
  holdout: ExperimentStats,
  variant: ExperimentStats,
  minSampleSize = 30
): SignificanceResult {
  const n1 = holdout.impressions;
  const x1 = holdout.conversions;
  const n2 = variant.impressions;
  const x2 = variant.conversions;

  const sampleSizeAdequate = n1 >= minSampleSize && n2 >= minSampleSize;

  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;

  const absoluteLift = p2 - p1;
  const relativeLiftPercent = p1 > 0 ? (absoluteLift / p1) * 100 : 0;

  if (!sampleSizeAdequate || n1 === 0 || n2 === 0) {
    return {
      holdout,
      variant,
      absoluteLift,
      relativeLiftPercent,
      zScore: 0,
      pValue: 1.0,
      statisticallySignificant: false,
      confidenceInterval95: [0, 0],
      sampleSizeAdequate: false,
    };
  }

  // Pooled proportion for hypothesis testing (H0: p1 == p2)
  const pPooled = (x1 + x2) / (n1 + n2);
  const sePooled = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

  let zScore = 0;
  let pValue = 1.0;

  if (sePooled > 0) {
    zScore = (p2 - p1) / sePooled;
    const absZ = Math.abs(zScore);
    pValue = 2 * (1 - normalCdf(absZ));
  }

  // Unpooled standard error for 95% confidence interval
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const marginOfError = 1.96 * seDiff;

  const confidenceInterval95: [number, number] = [
    Number((absoluteLift - marginOfError).toFixed(4)),
    Number((absoluteLift + marginOfError).toFixed(4)),
  ];

  const statisticallySignificant = pValue < 0.05 && absoluteLift > 0;

  return {
    holdout: {
      ...holdout,
      conversionRate: Number(p1.toFixed(4)),
    },
    variant: {
      ...variant,
      conversionRate: Number(p2.toFixed(4)),
    },
    absoluteLift: Number(absoluteLift.toFixed(4)),
    relativeLiftPercent: Number(relativeLiftPercent.toFixed(2)),
    zScore: Number(zScore.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    statisticallySignificant,
    confidenceInterval95,
    sampleSizeAdequate,
  };
}
