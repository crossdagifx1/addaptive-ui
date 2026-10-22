import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createControlPlaneServer } from "../src/server.js";
import { ControlPlaneStore } from "../src/store.js";

describe("@aui/control-plane", () => {
  it("should initialize store with default seeded site and variants", () => {
    const store = new ControlPlaneStore();
    const sites = store.listSites();
    expect(sites.length).toBeGreaterThanOrEqual(1);

    const site = sites[0];
    expect(site.apiKey).toMatch(/^aui_live_/);
    expect(site.monthlySpendCapUsd).toBe(500);

    const variants = store.listVariants(site.id);
    expect(variants.length).toBeGreaterThanOrEqual(2);
  });

  it("should create new sites with distinct API keys", () => {
    const store = new ControlPlaneStore();
    const site = store.createSite("FinTech Beta", "fintech.ai", "suggest-only");

    expect(site.id).toMatch(/^site_/);
    expect(site.apiKey).toMatch(/^aui_live_/);
    expect(site.approvalMode).toBe("suggest-only");
  });

  it("should update policy and spend caps with audit logging", () => {
    const store = new ControlPlaneStore();
    const site = store.listSites()[0];

    const updated = store.updatePolicy(
      site.id,
      { bannedPhrases: ["exclusive deal", "guaranteed returns"] },
      750
    );

    expect(updated.bannedPhrases).toContain("exclusive deal");
    expect(store.getSite(site.id)?.monthlySpendCapUsd).toBe(750);

    const logs = store.getAuditLogs(site.id);
    expect(logs[0].action).toBe("policy_updated");
  });

  it("should approve a pending variant and update version history", () => {
    const store = new ControlPlaneStore();
    const site = store.listSites()[0];
    const pending = store.listVariants(site.id).find((v) => v.status === "pending")!;

    const approved = store.approveVariant(pending.id, "reviewer@acme.com");
    expect(approved?.status).toBe("approved");

    const history = store.getVersionHistory(site.id);
    expect(history[0].blueprint.blueprintId).toBe(pending.blueprint.blueprintId);
    expect(history[0].deployedBy).toBe("reviewer@acme.com");
  });

  it("should execute 1-click rollback to prior version", () => {
    const store = new ControlPlaneStore();
    const site = store.listSites()[0];
    const historyBefore = store.getVersionHistory(site.id);
    const targetVersion = historyBefore[historyBefore.length - 1]; // Canonical default

    const rollback = store.rollbackVersion(site.id, targetVersion.versionId, "emergency-admin");
    expect(rollback).toBeDefined();
    expect(rollback?.notes).toContain("Rolled back to version");

    const logs = store.getAuditLogs(site.id);
    expect(logs[0].action).toBe("rollback");
  });

  describe("HTTP Server Endpoints", () => {
    let app: ReturnType<typeof createControlPlaneServer>;
    let baseUrl: string;

    beforeAll(async () => {
      app = createControlPlaneServer();
      const port = await app.listen(0); // Random port
      baseUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
      await app.close();
    });

    it("GET /api/health returns 200 OK", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
    });

    it("GET / serves the dashboard HTML", async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Adaptive UI Control Plane");
      expect(text).toContain("Zero-Tamper Guarantee");
    });

    it("POST /api/sites creates a site via REST API", async () => {
      const res = await fetch(`${baseUrl}/api/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "API Test Site", domain: "apitest.dev" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe("API Test Site");
    });

    it("POST /api/sites/:siteId/rollout updates canary percentage", async () => {
      const res = await fetch(`${baseUrl}/api/sites/site_acme_corp/rollout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolloutPercentage: 5 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.rolloutPercentage).toBe(5);
    });

    it("POST /api/sites/:siteId/killswitch activates emergency kill switch", async () => {
      const res = await fetch(`${baseUrl}/api/sites/site_acme_corp/killswitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isKillSwitchActive).toBe(true);
    });

    it("GET /api/sites/:siteId/preview-token generates staging preview URL", async () => {
      const res = await fetch(`${baseUrl}/api/sites/site_acme_corp/preview-token?variantId=bp_var_dev_speed`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.previewToken).toMatch(/^prev_/);
      expect(data.previewUrl).toContain("aui_preview=bp_var_dev_speed");
    });

    it("GET /api/sites/:siteId/experimentation returns statistical significance report", async () => {
      const res = await fetch(`${baseUrl}/api/sites/site_acme_corp/experimentation?segment=developer-speed`);
      expect(res.status).toBe(200);
      const report = await res.json();
      expect(report.segmentKey).toBe("developer-speed");
      expect(report.significance.holdout.impressions).toBe(400);
      expect(report.significance.variant.impressions).toBe(1000);
      expect(report.significance.relativeLiftPercent).toBeGreaterThan(40);
      expect(report.significance.statisticallySignificant).toBe(true);

      expect(report.guardrails.autoPauseRecommended).toBe(false);
    });

    it("GET and PUT /api/sites/:siteId/budget manages spend caps", async () => {
      const getRes = await fetch(`${baseUrl}/api/sites/site_acme_corp/budget`);
      expect(getRes.status).toBe(200);
      const budget = await getRes.json();
      expect(budget.siteId).toBe("site_acme_corp");

      const putRes = await fetch(`${baseUrl}/api/sites/site_acme_corp/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyCapUsd: 250 }),
      });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.monthlyCapUsd).toBe(250);
    });

    it("POST and GET /api/sites/:siteId/webhooks registers webhook subscriptions", async () => {
      const postRes = await fetch(`${baseUrl}/api/sites/site_acme_corp/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/aui-events",
          events: ["blueprint.applied", "guardrail.auto_paused"],
        }),
      });
      expect(postRes.status).toBe(201);
      const sub = await postRes.json();
      expect(sub.url).toBe("https://example.com/aui-events");

      const getRes = await fetch(`${baseUrl}/api/sites/site_acme_corp/webhooks`);
      expect(getRes.status).toBe(200);
      const list = await getRes.json();
      expect(list.some((s: any) => s.id === sub.id)).toBe(true);
    });

    it("GET /api/sites/:siteId/traces lists AI generation traces", async () => {
      const res = await fetch(`${baseUrl}/api/sites/site_acme_corp/traces`);
      expect(res.status).toBe(200);
      const traces = await res.json();
      expect(Array.isArray(traces)).toBe(true);
    });
  });
});

