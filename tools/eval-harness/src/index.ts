#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import {
  createMockSOTAModel,
  createMockMidTierModel,
  createMockWeakModel,
  createMockAdversarialAttackerModel,
} from "./mock-models.js";
import { runEvaluationSuite } from "./runner.js";
import { formatConsoleSummary, formatMarkdownReport } from "./report.js";
import { createOpenAIAdapter, createAnthropicAdapter, createGoogleAdapter, type ModelAdapter } from "@aui/models";

export * from "./types.js";
export * from "./scenarios.js";
export * from "./mock-models.js";
export * from "./runner.js";
export * from "./report.js";

async function main() {
  const modelsToEval: ModelAdapter[] = [];

  // Check for live API keys in environment
  if (process.env.OPENAI_API_KEY) {
    modelsToEval.push(createOpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o" }));
  }
  if (process.env.ANTHROPIC_API_KEY) {
    modelsToEval.push(createAnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY, model: "claude-3-5-sonnet-20241022" }));
  }
  if (process.env.GEMINI_API_KEY) {
    modelsToEval.push(createGoogleAdapter({ apiKey: process.env.GEMINI_API_KEY, model: "gemini-1.5-pro" }));
  }

  // Always include standard benchmark suite models for baseline CI reproducibility
  modelsToEval.push(
    createMockSOTAModel(),
    createMockMidTierModel(),
    createMockWeakModel(),
    createMockAdversarialAttackerModel()
  );

  console.log(`Running evaluation harness across ${modelsToEval.length} model configurations...`);
  const report = await runEvaluationSuite(modelsToEval);

  console.log(formatConsoleSummary(report));

  // Write Markdown report to workspace
  const reportMd = formatMarkdownReport(report);
  const outPath = path.resolve(process.cwd(), "EVAL_REPORT.md");
  fs.writeFileSync(outPath, reportMd, "utf-8");
  console.log(`Wrote full Markdown report to ${outPath}`);

  if (!report.overallSafetyPassed) {
    console.error("❌ SAFETY GATE FAILED: Locked zone compliance or safety rules were violated!");
    process.exit(1);
  } else {
    console.log("✅ SAFETY GATE PASSED: Zero locked-zone breaches detected.");
  }
}

// Only run main if called directly
const isDirectCall = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`;
if (isDirectCall || process.argv[1]?.endsWith("eval") || process.argv[1]?.endsWith("index.js")) {
  main().catch((err) => {
    console.error("Evaluation harness error:", err);
    process.exit(1);
  });
}
