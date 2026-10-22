import type { ModelAdapter, GenerateRequest, GenerateResult, CostEstimate } from "@aui/models";
import { defaultLandingBlueprint } from "@aui/components-landing";
import type { Blueprint } from "@aui/schema";

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

/**
 * Creates an adapted blueprint customized for a given scenario.
 */
function createScenarioBlueprint(scenarioHint: string, isAdversarial = false): Blueprint {
  const bp = clone(defaultLandingBlueprint);
  bp.meta.createdAt = new Date().toISOString();

  if (scenarioHint.includes("enterprise")) {
    bp.meta.reasoning = "Enterprise B2B Adaptive Landing Page";
    const hero = bp.components.hero;
    if (hero) {
      hero.props.headline = "Engineered for Enterprise Scale & Uncompromising Security";
      hero.props.subheadline =
        "Deploy adaptive user experiences across global infrastructure with guaranteed 99.99% uptime, dedicated VPCs, and full role-based governance.";
      hero.props.primaryCta = { label: "Schedule Executive Briefing", action: "navigate:/enterprise-demo" };
    }
  } else if (scenarioHint.includes("developer") || scenarioHint.includes("speed")) {
    bp.meta.reasoning = "Developer-First High Velocity Landing Page";
    const hero = bp.components.hero;
    if (hero) {
      hero.props.headline = "The Edge-Native Adaptive UI Engine for Modern Teams";
      hero.props.subheadline =
        "Ship personalized experiences at 15ms TTFB. Zero client-side bloat, 100% JSON data blueprints, and instant rollback.";
      hero.props.primaryCta = { label: "Read Documentation", action: "navigate:/docs" };
    }
  } else if (scenarioHint.includes("mobile") || scenarioHint.includes("growth")) {
    bp.meta.reasoning = "Mobile Growth Variant";
    const hero = bp.components.hero;
    if (hero) {
      hero.props.headline = "Convert Every Visitor with Self-Adapting Web Experiences";
      hero.props.subheadline =
        "Automate high-converting UI variations in minutes. No complex A/B testing infrastructure required.";
    }
  }

  if (isAdversarial) {
    const hero = bp.components.hero;
    if (scenarioHint.includes("homoglyph")) {
      if (hero) {
        hero.props.headline = "We promise gu\u0430r\u0430nteed 100% investment returns";
      }
    } else if (scenarioHint.includes("script")) {
      if (hero) {
        hero.props.headline = "Safe <script>alert('pwn')</script> Experience";
      }
    } else {
      // Malicious attempt: tamper with locked pricing or insert deceptive claims
      const pricing = bp.components.pricing;
      if (pricing) {
        pricing.props.plans = [
          {
            name: "Attacker Tier",
            price: "$0 FREE EVERYTHING",
            period: "forever",
            features: ["Unlimited everything"],
            cta: "Steal Deal",
          },
        ];
      }
      if (hero) {
        hero.props.headline = "Guaranteed 1000% ROI, No Risk, Hurry only 1 spot left!";
        hero.props.primaryCta = { label: "Click Here", action: "javascript:alert(document.cookie)" };
      }
    }
  }

  return bp;
}

/**
 * SOTA Model: Produces compliant blueprints, resists prompt injections.
 */
export function createMockSOTAModel(): ModelAdapter {
  return {
    id: "sota-gpt4o-simulated",
    capabilities: {
      structuredOutput: "native",
      maxContextTokens: 128000,
      supportsStreaming: true,
      supportsImages: true,
      metadata: { tier: "sota", provider: "OpenAI" },
    },
    estimateCost(req: GenerateRequest): CostEstimate {
      const inTok = Math.round(req.input.length / 4);
      const outTok = 1800;
      return {
        estimatedInputTokens: inTok,
        estimatedOutputTokens: outTok,
        estimatedCostUsd: (inTok * 0.005 + outTok * 0.015) / 1000,
        estimatedLatencyMs: 650,
      };
    },
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const promptLower = (req.input + " " + req.system).toLowerCase();
      // Safe adaptation
      const bp = createScenarioBlueprint(promptLower, false);
      const raw = JSON.stringify(bp, null, 2);
      return {
        raw,
        parsed: bp,
        usage: { inputTokens: 1200, outputTokens: 1450 },
        latencyMs: 580 + Math.floor(Math.random() * 120),
        finishReason: "stop",
      };
    },
  };
}

/**
 * Mid-Tier Model: Good capability, repairs if schema error prompted.
 */
export function createMockMidTierModel(): ModelAdapter {
  let attemptCount = 0;
  return {
    id: "mid-tier-claude35-simulated",
    capabilities: {
      structuredOutput: "native",
      maxContextTokens: 200000,
      supportsStreaming: true,
      supportsImages: true,
      metadata: { tier: "mid", provider: "Anthropic" },
    },
    estimateCost(req: GenerateRequest): CostEstimate {
      const inTok = Math.round(req.input.length / 4);
      const outTok = 1600;
      return {
        estimatedInputTokens: inTok,
        estimatedOutputTokens: outTok,
        estimatedCostUsd: (inTok * 0.003 + outTok * 0.012) / 1000,
        estimatedLatencyMs: 820,
      };
    },
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      attemptCount++;
      const promptLower = (req.input + " " + req.system).toLowerCase();
      const isRepair = promptLower.includes("validation error") || promptLower.includes("repair");

      // On 1st attempt in developer scenario, introduce a recoverable minor schema flaw to test repair loop
      if (promptLower.includes("developer") && !isRepair && attemptCount % 2 === 1) {
        const bp: any = createScenarioBlueprint(promptLower, false);
        // Omit version to trigger schema validation error on turn 1
        delete bp.schemaVersion;
        const raw = JSON.stringify(bp);
        return {
          raw,
          parsed: bp,
          usage: { inputTokens: 1100, outputTokens: 1300 },
          latencyMs: 780,
          finishReason: "stop",
        };
      }

      const bp = createScenarioBlueprint(promptLower, false);
      return {
        raw: JSON.stringify(bp, null, 2),
        parsed: bp,
        usage: { inputTokens: 1300, outputTokens: 1500 },
        latencyMs: 720 + Math.floor(Math.random() * 100),
        finishReason: "stop",
      };
    },
  };
}

/**
 * Weak/Local 7B Model: Lower first-turn accuracy, requires repair loop.
 */
export function createMockWeakModel(): ModelAdapter {
  return {
    id: "local-7b-simulated",
    capabilities: {
      structuredOutput: "prompted",
      maxContextTokens: 8192,
      supportsStreaming: false,
      supportsImages: false,
      metadata: { tier: "local", provider: "Ollama" },
    },
    estimateCost(): CostEstimate {
      return {
        estimatedInputTokens: 900,
        estimatedOutputTokens: 1200,
        estimatedCostUsd: 0.0, // Local is zero token cost
        estimatedLatencyMs: 1450,
      };
    },
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const promptLower = (req.input + " " + req.system).toLowerCase();
      const isRepair = promptLower.includes("validation error") || promptLower.includes("repair");

      if (!isRepair && (promptLower.includes("growth") || promptLower.includes("mobile"))) {
        // First turn contains invalid component type
        const bp: any = createScenarioBlueprint(promptLower, false);
        bp.components.invalid_section = {
          type: "NonExistentComponent",
          props: {},
        };
        return {
          raw: JSON.stringify(bp),
          parsed: bp,
          usage: { inputTokens: 850, outputTokens: 920 },
          latencyMs: 1350,
          finishReason: "stop",
        };
      }

      const bp = createScenarioBlueprint(promptLower, false);
      return {
        raw: JSON.stringify(bp),
        parsed: bp,
        usage: { inputTokens: 950, outputTokens: 1100 },
        latencyMs: 1250,
        finishReason: "stop",
      };
    },
  };
}

/**
 * Adversarial Attacker Model: Deliberately returns malicious output to test validation pipeline.
 */
export function createMockAdversarialAttackerModel(): ModelAdapter {
  return {
    id: "adversarial-attacker-simulated",
    capabilities: {
      structuredOutput: "none",
      maxContextTokens: 4096,
      supportsStreaming: false,
      supportsImages: false,
      metadata: { tier: "adversarial", provider: "RedTeam" },
    },
    estimateCost(): CostEstimate {
      return {
        estimatedInputTokens: 500,
        estimatedOutputTokens: 800,
        estimatedCostUsd: 0.0,
        estimatedLatencyMs: 300,
      };
    },
    async generate(): Promise<GenerateResult> {
      const bp = createScenarioBlueprint("adversarial", true);
      return {
        raw: JSON.stringify(bp),
        parsed: bp,
        usage: { inputTokens: 500, outputTokens: 800 },
        latencyMs: 320,
        finishReason: "stop",
      };
    },
  };
}
