import { describe, it, expect } from "vitest";
import {
  parseExplicitIntent,
  evaluateTriggers,
  DEFAULT_TRIGGER_RULES,
  type TriggerRule,
} from "../src/index.js";

describe("@aui/decision — Triggers and Signals Engine", () => {
  describe("parseExplicitIntent", () => {
    it("identifies explicit requests accurately", () => {
      expect(parseExplicitIntent("Can you make this simpler please?")).toBe("simpler");
      expect(parseExplicitIntent("Show me the developer API and CLI")).toBe("technical");
      expect(parseExplicitIntent("Need SOC2 enterprise compliance")).toBe("enterprise");
      expect(parseExplicitIntent("What are the pricing tiers and cost?")).toBe("pricing");
      expect(parseExplicitIntent("Is this fast? Need edge latency benchmarks")).toBe("speed");
      expect(parseExplicitIntent("Is it safe? Need security details")).toBe("security");
      expect(parseExplicitIntent(undefined)).toBeUndefined();
    });
  });

  describe("evaluateTriggers", () => {
    it("triggers simplification adaptation on explicit request with highest priority", () => {
      const result = evaluateTriggers({
        explicitRequest: "make this simpler",
        behavior: {
          dwellTimeMs: 5000,
          scrollDepthPercent: 20,
        },
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_explicit_simpler");
      expect(result.targetSegment).toBe("simplicity-focused");
      expect(result.adaptationInstructions).toContain("Strip dense jargon");
    });

    it("triggers developer technical mode when explicit technical request is provided", () => {
      const result = evaluateTriggers({
        explicitRequest: "developer cli and typescript schemas",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_explicit_technical");
      expect(result.targetSegment).toBe("developer-speed");
      expect(result.adaptationInstructions).toContain("pnpm add @aui/cli");
    });

    it("triggers enterprise B2B adaptation on enterprise intent", () => {
      const result = evaluateTriggers({
        explicitRequest: "we are a fortune 500 enterprise team needing soc2",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_explicit_enterprise");
      expect(result.targetSegment).toBe("enterprise-b2b");
      expect(result.adaptationInstructions).toContain("SOC2 Type II");
    });

    it("triggers exit-intent saver when cursor velocity indicates abandonment after dwell", () => {
      const result = evaluateTriggers({
        behavior: {
          dwellTimeMs: 18000,
          scrollDepthPercent: 45,
          exitIntent: true,
        },
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_behavior_exit_intent");
      expect(result.targetSegment).toBe("exit-intent-offer");
    });

    it("does not trigger exit-intent saver if dwell time is too short (bounce protection)", () => {
      const result = evaluateTriggers({
        behavior: {
          dwellTimeMs: 2000, // < 15s threshold
          exitIntent: true,
        },
      });

      expect(result.matched).toBe(false);
    });

    it("triggers pricing clarity on deep scroll and evaluation dwell", () => {
      const result = evaluateTriggers({
        behavior: {
          dwellTimeMs: 30000,
          scrollDepthPercent: 85,
        },
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_behavior_scroll_pricing");
      expect(result.targetSegment).toBe("pricing-clarity");
    });

    it("triggers mobile optimization context rule for mobile viewports", () => {
      const result = evaluateTriggers({
        context: {
          device: "mobile",
        },
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("rule_context_mobile_speed");
      expect(result.targetSegment).toBe("mobile-optimized");
    });

    it("respects custom priority rules override", () => {
      const customRule: TriggerRule = {
        id: "custom_partner_deal",
        name: "Partner Referral Override",
        priority: 200,
        conditions: {
          utmSources: ["producthunt"],
        },
        action: {
          type: "adapt_variant",
          targetSegment: "producthunt-special",
          adaptationInstructions: "Welcome Product Hunt visitors with exclusive launch badge.",
        },
      };

      const result = evaluateTriggers(
        {
          explicitRequest: "make this simpler", // priority 100
          context: {
            campaign: { source: "producthunt" },
          },
        },
        [...DEFAULT_TRIGGER_RULES, customRule]
      );

      // Custom rule with priority 200 wins
      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("custom_partner_deal");
      expect(result.targetSegment).toBe("producthunt-special");
    });
  });
});
