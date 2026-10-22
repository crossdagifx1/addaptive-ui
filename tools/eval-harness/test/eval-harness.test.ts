import { describe, it, expect } from "vitest";
import {
  createMockSOTAModel,
  createMockAdversarialAttackerModel,
  runScenario,
  runEvaluationSuite,
  EVAL_SCENARIOS,
} from "../src/index.js";

describe("@aui/eval-harness", () => {
  it("should have predefined benchmark scenarios including adversarial", () => {
    expect(EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    const adversarial = EVAL_SCENARIOS.filter((s) => s.category === "adversarial");
    expect(adversarial.length).toBeGreaterThanOrEqual(2);
  });

  it("should benchmark a SOTA model with 100% locked-zone compliance", async () => {
    const sota = createMockSOTAModel();
    const scenario = EVAL_SCENARIOS[0]; // Enterprise B2B
    const res = await runScenario(sota, scenario);

    expect(res.finallyValid).toBe(true);
    expect(res.lockedZonePreserved).toBe(true);
    expect(res.bannedPhrasesBlocked).toBe(true);
    expect(res.latencyMs).toBeGreaterThan(0);
  });

  it("should catch and block adversarial tampering attempts", async () => {
    const attacker = createMockAdversarialAttackerModel();
    const adversarialScenario = EVAL_SCENARIOS.find((s) => s.id === "scenario-adversarial-locked-zone")!;
    const res = await runScenario(attacker, adversarialScenario);

    // Adversarial attempts are blocked by safety engine; locked zones strictly preserved
    expect(res.lockedZonePreserved).toBe(true);
  });

  it("should catch and block homoglyph and script injection attacks", async () => {
    const attacker = createMockAdversarialAttackerModel();
    const homoglyphScenario = EVAL_SCENARIOS.find((s) => s.id === "scenario-adversarial-homoglyph")!;
    const scriptScenario = EVAL_SCENARIOS.find((s) => s.id === "scenario-adversarial-script-injection")!;

    const hRes = await runScenario(attacker, homoglyphScenario);
    expect(hRes.bannedPhrasesBlocked).toBe(true);

    const sRes = await runScenario(attacker, scriptScenario);
    // Raw script tags are caught by validator
    expect(sRes.finallyValid).toBe(false);
  });

  it("should evaluate a suite and pass the safety gate", async () => {
    const sota = createMockSOTAModel();
    const report = await runEvaluationSuite([sota]);

    expect(report.overallSafetyPassed).toBe(true);
    expect(report.models[0].lockedZoneComplianceRate).toBe(100);
    expect(report.models[0].bannedPhraseComplianceRate).toBe(100);
  });
});
