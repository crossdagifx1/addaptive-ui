export interface SpendBudget {
  siteId: string;
  monthlyCapUsd: number;
  currentSpendUsd: number;
  warningThresholdPercent: number; // e.g. 80
  warningEmitted: boolean;
  isAutoPaused: boolean;
  billingPeriod: string; // YYYY-MM
  updatedAt: string;
}

export interface SpendRecordResult {
  currentSpendUsd: number;
  monthlyCapUsd: number;
  percentUsed: number;
  warningTriggered: boolean;
  capExceeded: boolean;
  isAutoPaused: boolean;
}

/**
 * In-memory / storage-backed spend governor for enforcing site budget caps.
 */
export class SpendGovernor {
  private budgets = new Map<string, SpendBudget>();

  constructor(initialBudgets: SpendBudget[] = []) {
    for (const b of initialBudgets) {
      this.budgets.set(b.siteId, { ...b });
    }
  }

  getBudget(siteId: string): SpendBudget {
    const currentPeriod = new Date().toISOString().substring(0, 7);
    let budget = this.budgets.get(siteId);

    if (!budget || budget.billingPeriod !== currentPeriod) {
      budget = {
        siteId,
        monthlyCapUsd: 150.0, // Default $150/mo cap
        currentSpendUsd: 0.0,
        warningThresholdPercent: 80,
        warningEmitted: false,
        isAutoPaused: false,
        billingPeriod: currentPeriod,
        updatedAt: new Date().toISOString(),
      };
      this.budgets.set(siteId, budget);
    }
    return budget;
  }

  setMonthlyCap(siteId: string, capUsd: number, warningThresholdPercent = 80): SpendBudget {
    const budget = this.getBudget(siteId);
    budget.monthlyCapUsd = Math.max(0, capUsd);
    budget.warningThresholdPercent = warningThresholdPercent;
    budget.isAutoPaused = budget.currentSpendUsd >= budget.monthlyCapUsd;
    budget.updatedAt = new Date().toISOString();
    return budget;
  }

  recordSpend(siteId: string, costUsd: number): SpendRecordResult {
    const budget = this.getBudget(siteId);
    budget.currentSpendUsd += Math.max(0, costUsd);
    budget.updatedAt = new Date().toISOString();

    const percentUsed = budget.monthlyCapUsd > 0
      ? (budget.currentSpendUsd / budget.monthlyCapUsd) * 100
      : 100;

    let warningTriggered = false;
    if (percentUsed >= budget.warningThresholdPercent && !budget.warningEmitted) {
      budget.warningEmitted = true;
      warningTriggered = true;
    }

    let capExceeded = false;
    if (budget.currentSpendUsd >= budget.monthlyCapUsd) {
      budget.isAutoPaused = true;
      capExceeded = true;
    }

    return {
      currentSpendUsd: Number(budget.currentSpendUsd.toFixed(4)),
      monthlyCapUsd: budget.monthlyCapUsd,
      percentUsed: Number(percentUsed.toFixed(1)),
      warningTriggered,
      capExceeded,
      isAutoPaused: budget.isAutoPaused,
    };
  }

  canGenerate(siteId: string): boolean {
    const budget = this.getBudget(siteId);
    return !budget.isAutoPaused;
  }

  resetBudget(siteId: string): void {
    const budget = this.getBudget(siteId);
    budget.currentSpendUsd = 0;
    budget.warningEmitted = false;
    budget.isAutoPaused = false;
    budget.updatedAt = new Date().toISOString();
  }
}
