import type { VisitorContext } from "./context.js";

export type ExplicitIntentType =
  | "simpler"
  | "technical"
  | "enterprise"
  | "pricing"
  | "speed"
  | "security"
  | string;

export interface BehavioralSignals {
  /** Time spent on the current page in milliseconds */
  dwellTimeMs?: number;
  /** Maximum scroll depth percentage (0 - 100) */
  scrollDepthPercent?: number;
  /** Whether visitor cursor or touch velocity indicates exit intent */
  exitIntent?: boolean;
  /** Number of rapid repeated clicks indicating frustration */
  rageClicks?: number;
  /** Whether the user copied a code snippet or API command */
  copiedCode?: boolean;
  /** Total number of visits recorded for this visitor */
  sessionCount?: number;
  /** Section currently in viewport or receiving highest focus */
  activeSection?: string;
}

export interface VisitorSignals {
  /** Explicit prompt or search query entered by visitor */
  explicitRequest?: string;
  /** Parsed explicit intent */
  intent?: ExplicitIntentType;
  /** Behavioral telemetry */
  behavior?: BehavioralSignals;
  /** Environmental and context attributes */
  context?: Partial<VisitorContext>;
}

export interface TriggerConditions {
  /** Keywords or intent keys that match explicit requests */
  intents?: string[];
  /** Minimum dwell time on page in milliseconds */
  minDwellTimeMs?: number;
  /** Minimum scroll depth percentage */
  minScrollDepthPercent?: number;
  /** Requires exit intent detection */
  requireExitIntent?: boolean;
  /** Matching UTM sources */
  utmSources?: string[];
  /** Matching device types */
  devices?: ("mobile" | "tablet" | "desktop")[];
  /** Minimum session count for returning visitors */
  minSessions?: number;
}

export interface TriggerAction {
  type: "adapt_variant" | "override_segment" | "highlight_section";
  targetSegment: string;
  adaptationInstructions: string;
  priorityWeight?: number;
}

export interface TriggerRule {
  id: string;
  name: string;
  priority: number; // Higher number = higher priority
  conditions: TriggerConditions;
  action: TriggerAction;
}

export interface TriggerEvaluationResult {
  matched: boolean;
  rule?: TriggerRule;
  targetSegment?: string;
  adaptationInstructions?: string;
  matchedIntents: string[];
}

/**
 * Normalizes and extracts explicit intent from free-text user requests.
 */
export function parseExplicitIntent(query?: string): ExplicitIntentType | undefined {
  if (!query || typeof query !== "string") return undefined;
  const q = query.toLowerCase().trim();

  if (q.includes("simpler") || q.includes("simple") || q.includes("tldr") || q.includes("too complex") || q.includes("summary")) {
    return "simpler";
  }
  if (q.includes("dev") || q.includes("code") || q.includes("api") || q.includes("cli") || q.includes("technical") || q.includes("typescript")) {
    return "technical";
  }
  if (q.includes("enterprise") || q.includes("soc2") || q.includes("vpc") || q.includes("compliance") || q.includes("sales") || q.includes("b2b")) {
    return "enterprise";
  }
  if (q.includes("pricing") || q.includes("price") || q.includes("cost") || q.includes("plan") || q.includes("tier")) {
    return "pricing";
  }
  if (q.includes("speed") || q.includes("fast") || q.includes("latency") || q.includes("edge") || q.includes("benchmark")) {
    return "speed";
  }
  if (q.includes("security") || q.includes("guardrail") || q.includes("safe") || q.includes("audit") || q.includes("privacy")) {
    return "security";
  }
  return q;
}

/**
 * Default rule catalog covering explicit requests, behavioral triggers, and context rules.
 */
export const DEFAULT_TRIGGER_RULES: TriggerRule[] = [
  {
    id: "rule_explicit_simpler",
    name: "Explicit Request: Make This Simpler",
    priority: 100, // Top priority: explicit user choice overrides implicit signals
    conditions: {
      intents: ["simpler", "simple", "tldr", "summary"],
    },
    action: {
      type: "adapt_variant",
      targetSegment: "simplicity-focused",
      adaptationInstructions:
        "Visitor requested a simpler interface. Strip dense jargon and verbose explanations. Present 3 crystal-clear bullet points, prominent social proof, and a single high-contrast primary CTA.",
    },
  },
  {
    id: "rule_explicit_technical",
    name: "Explicit Request: Developer / Technical Mode",
    priority: 95,
    conditions: {
      intents: ["technical", "developer", "api", "cli", "typescript"],
    },
    action: {
      type: "adapt_variant",
      targetSegment: "developer-speed",
      adaptationInstructions:
        "Visitor is a technical engineer or developer. Highlight terminal installation snippet (pnpm add @aui/cli), TypeScript JSON schema contract, and sub-15ms edge routing latency.",
    },
  },
  {
    id: "rule_explicit_enterprise",
    name: "Explicit Request: Enterprise & Security Consultation",
    priority: 90,
    conditions: {
      intents: ["enterprise", "soc2", "vpc", "compliance", "sales"],
    },
    action: {
      type: "adapt_variant",
      targetSegment: "enterprise-b2b",
      adaptationInstructions:
        "Visitor is evaluating enterprise deployment. Highlight SOC2 Type II certification, VPC deployment options, 99.99% uptime SLA, and offer an architecture consultation review CTA.",
    },
  },
  {
    id: "rule_behavior_exit_intent",
    name: "Behavior: High-Dwell Exit Intent Saver",
    priority: 70,
    conditions: {
      requireExitIntent: true,
      minDwellTimeMs: 15000,
    },
    action: {
      type: "adapt_variant",
      targetSegment: "exit-intent-offer",
      adaptationInstructions:
        "Visitor is moving cursor towards tab close after spending >15s on page. Adapt banner and hero to highlight our 14-day zero-risk pilot with 1-click rollback and holdout baseline protection.",
    },
  },
  {
    id: "rule_behavior_scroll_pricing",
    name: "Behavior: Deep Scroll Pricing Evaluation",
    priority: 60,
    conditions: {
      minScrollDepthPercent: 70,
      minDwellTimeMs: 25000,
    },
    action: {
      type: "adapt_variant",
      targetSegment: "pricing-clarity",
      adaptationInstructions:
        "Visitor has scrolled past 70% of the page and spent >25s evaluating options. Highlight transparent spend caps, zero hidden fees, and verified A/B test ROI.",
    },
  },
  {
    id: "rule_context_mobile_speed",
    name: "Context: Mobile Device Optimization",
    priority: 40,
    conditions: {
      devices: ["mobile"],
    },
    action: {
      type: "adapt_variant",
      targetSegment: "mobile-optimized",
      adaptationInstructions:
        "Visitor is browsing from a mobile viewport. Adapt copy to be punchy and scannable with prominent tap targets and lightweight hero imagery.",
    },
  },
];

/**
 * Evaluates incoming signals against registered trigger rules and determines
 * whether an adaptation should fire.
 */
export function evaluateTriggers(
  signals: VisitorSignals,
  customRules: TriggerRule[] = DEFAULT_TRIGGER_RULES
): TriggerEvaluationResult {
  const detectedIntent = signals.intent || parseExplicitIntent(signals.explicitRequest);
  const matchedIntents: string[] = [];
  if (detectedIntent) {
    matchedIntents.push(detectedIntent);
  }

  // Sort rules descending by priority
  const sortedRules = [...customRules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const c = rule.conditions;

    // 1. Check explicit intent condition
    if (c.intents && c.intents.length > 0) {
      if (!detectedIntent || !c.intents.includes(detectedIntent)) {
        continue;
      }
    }

    // 2. Check exit intent condition
    if (c.requireExitIntent && !signals.behavior?.exitIntent) {
      continue;
    }

    // 3. Check dwell time condition
    if (c.minDwellTimeMs !== undefined) {
      const actualDwell = signals.behavior?.dwellTimeMs ?? 0;
      if (actualDwell < c.minDwellTimeMs) {
        continue;
      }
    }

    // 4. Check scroll depth condition
    if (c.minScrollDepthPercent !== undefined) {
      const actualScroll = signals.behavior?.scrollDepthPercent ?? 0;
      if (actualScroll < c.minScrollDepthPercent) {
        continue;
      }
    }

    // 5. Check device condition
    if (c.devices && c.devices.length > 0) {
      const actualDevice = signals.context?.device || "desktop";
      if (!c.devices.includes(actualDevice)) {
        continue;
      }
    }

    // 6. Check UTM sources
    if (c.utmSources && c.utmSources.length > 0) {
      const actualSource = signals.context?.campaign?.["source"] || signals.context?.referrer;
      if (!actualSource || !c.utmSources.some((s) => actualSource.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }
    }

    // Rule matched!
    return {
      matched: true,
      rule,
      targetSegment: rule.action.targetSegment,
      adaptationInstructions: rule.action.adaptationInstructions,
      matchedIntents,
    };
  }

  return {
    matched: false,
    matchedIntents,
  };
}
