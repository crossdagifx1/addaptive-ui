import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SQLiteStorage,
  signBlueprint,
  verifyBlueprintSignature,
  hasPermission,
  generateApiKey,
  verifyApiKey,
  VariantCache,
  AsyncGenerationQueue,
} from "../src/index.js";
import type { Blueprint } from "@aui/schema";

const sampleBlueprint: Blueprint = {
  version: "1.0",
  blueprintId: "bp_test_123",
  targetSegment: "enterprise",
  components: {
    hero: {
      type: "HeroSection",
      version: "1.0.0",
      props: {
        headline: "Scale Your Enterprise",
        subheadline: "Robust cloud infrastructure with 99.99% SLA",
      },
    },
  },
  meta: {
    generatedBy: "test-model",
    confidence: 0.95,
  },
};

describe("@aui/storage", () => {
  let storage: SQLiteStorage;

  beforeEach(() => {
    storage = new SQLiteStorage(":memory:");
    storage.createSite({
      id: "site_test_01",
      name: "Test Corp",
      domain: "testcorp.io",
      approvalMode: "approve-first" as const,
      apiKey: generateApiKey(),
      monthlySpendCapUsd: 1000,
      currentSpendUsd: 45.5,
      activeBlueprintId: "bp_test_123",
      rolloutPercentage: 5,
      isKillSwitchActive: false,
      createdAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    storage.close();
  });

  describe("SQLite Database CRUD", () => {
    it("creates, retrieves, and updates sites with rollout controls", () => {
      const site = {
        id: "site_test_02",
        name: "Test Corp",
        domain: "testcorp.io",
        approvalMode: "approve-first" as const,
        apiKey: generateApiKey(),
        monthlySpendCapUsd: 1000,
        currentSpendUsd: 45.5,
        activeBlueprintId: "bp_test_123",
        rolloutPercentage: 5, // 5% canary
        isKillSwitchActive: false,
        createdAt: new Date().toISOString(),
      };

      storage.createSite(site);
      const retrieved = storage.getSite("site_test_02");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe("Test Corp");
      expect(retrieved?.rolloutPercentage).toBe(5);
      expect(retrieved?.isKillSwitchActive).toBe(false);

      // By API Key
      const byKey = storage.getSiteByApiKey(site.apiKey);
      expect(byKey?.id).toBe("site_test_02");

      // Update rollout to 25% and toggle kill switch
      storage.updateSite("site_test_02", {
        rolloutPercentage: 25,
        isKillSwitchActive: true,
      });

      const updated = storage.getSite("site_test_02");
      expect(updated?.rolloutPercentage).toBe(25);
      expect(updated?.isKillSwitchActive).toBe(true);
    });


    it("manages policy lifecycle with UPSERT", () => {
      const policy: any = {
        version: "1.0",
        lockedComponents: ["pricing", "legal"],
        allowedComponents: ["hero", "banner"],
        maxTokenBudget: 5000,
        rateLimits: { maxRequestsPerMinute: 60 },
      };

      storage.setPolicy("site_test_01", policy);
      const retrieved = storage.getPolicy("site_test_01");
      expect(retrieved).toEqual(policy);

      // Update policy
      policy.maxTokenBudget = 8000;
      storage.setPolicy("site_test_01", policy);
      expect(storage.getPolicy("site_test_01")?.maxTokenBudget).toBe(8000);
    });

    it("saves variants, version history, audit logs, and analytics events", () => {
      // 1. Variant
      storage.saveVariant({
        id: "var_01",
        siteId: "site_test_01",
        segmentKey: "enterprise",
        status: "pending",
        blueprint: sampleBlueprint,
        parentBlueprintId: "bp_root",
        reasoning: "Enterprise optimization",
        metrics: { latencyMs: 650, tokensUsed: 1200, costUsd: 0.015, validationPassed: true },
        createdAt: new Date().toISOString(),
      });

      expect(storage.listVariants("site_test_01")).toHaveLength(1);
      storage.updateVariantStatus("var_01", "approved");
      expect(storage.getVariant("var_01")?.status).toBe("approved");

      // 2. Version history
      storage.addVersion({
        id: "ver_01",
        siteId: "site_test_01",
        blueprint: sampleBlueprint,
        segment: "enterprise",
        deployedBy: "admin",
        notes: "Initial launch",
        createdAt: new Date().toISOString(),
      });
      expect(storage.listVersions("site_test_01")).toHaveLength(1);

      // 3. Audit log
      storage.addAuditLog({
        id: "audit_01",
        siteId: "site_test_01",
        timestamp: new Date().toISOString(),
        action: "variant_approved",
        actor: "admin_user",
        details: { variantId: "var_01" },
      });
      expect(storage.listAuditLogs("site_test_01")).toHaveLength(1);

      // 4. Analytics event
      storage.recordAnalyticsEvent({
        id: "evt_01",
        siteId: "site_test_01",
        pageId: "landing",
        sessionId: "sess_123",
        eventType: "conversion",
        groupName: "variant",
        segmentKey: "enterprise",
        blueprintId: "bp_test_123",
        timestamp: new Date().toISOString(),
      });
      expect(storage.listAnalyticsEvents("site_test_01")).toHaveLength(1);
    });
  });

  describe("Signed Blueprints Cryptography", () => {
    const secretKey = "aui_secret_key_top_secret_123456789";

    it("signs a blueprint with HMAC-SHA256 and verifies successfully", () => {
      const signed = signBlueprint(sampleBlueprint, secretKey);
      expect(signed.meta?.signature).toMatch(/^sig_sha256_[0-9a-f]{64}$/);

      const verification = verifyBlueprintSignature(signed, secretKey);
      expect(verification.valid).toBe(true);
    });

    it("detects and rejects tampering in signed blueprints", () => {
      const signed = signBlueprint(sampleBlueprint, secretKey);

      // Tamper with content (e.g. adversary altered headline)
      const tampered: Blueprint = JSON.parse(JSON.stringify(signed));
      tampered.components.hero!.props.headline = "Malicious Injected Content";

      const verification = verifyBlueprintSignature(tampered, secretKey);
      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain("Signature mismatch");
    });

    it("rejects verification with wrong secret key", () => {
      const signed = signBlueprint(sampleBlueprint, secretKey);
      const verification = verifyBlueprintSignature(signed, "wrong_secret_key");
      expect(verification.valid).toBe(false);
    });
  });

  describe("Auth & RBAC", () => {
    it("enforces strict role permissions", () => {
      // Owner can do everything
      expect(hasPermission("owner", "create_site")).toBe(true);
      expect(hasPermission("owner", "manage_team")).toBe(true);
      expect(hasPermission("owner", "toggle_killswitch")).toBe(true);
      expect(hasPermission("owner", "approve_variant")).toBe(true);

      // Admin cannot manage team or create sites, but can approve and toggle killswitch
      expect(hasPermission("admin", "manage_team")).toBe(false);
      expect(hasPermission("admin", "toggle_killswitch")).toBe(true);
      expect(hasPermission("admin", "approve_variant")).toBe(true);

      // Editor can approve variants but cannot edit policies or toggle killswitch
      expect(hasPermission("editor", "approve_variant")).toBe(true);
      expect(hasPermission("editor", "edit_policy")).toBe(false);
      expect(hasPermission("editor", "toggle_killswitch")).toBe(false);

      // Viewer is read-only
      expect(hasPermission("viewer", "view")).toBe(true);
      expect(hasPermission("viewer", "approve_variant")).toBe(false);
    });

    it("performs timing-safe API key verification", () => {
      const key = generateApiKey("aui_live");
      expect(key.startsWith("aui_live_")).toBe(true);
      expect(verifyApiKey(key, key)).toBe(true);
      expect(verifyApiKey(key, "invalid_key")).toBe(false);
    });
  });

  describe("VariantCache & Negative Caching", () => {
    it("handles L1/L2 hits, TTL, and negative caching", () => {
      const cache = new VariantCache(storage, {
        ttlSeconds: 3600,
        negativeTtlSeconds: 60,
      });

      const key = VariantCache.buildKey("site_01", "enterprise");

      // Miss
      expect(cache.get(key).hit).toBe(false);

      // Positive Set & Hit
      cache.set("site_01", "enterprise", sampleBlueprint);
      const hit = cache.get(key);
      expect(hit.hit).toBe(true);
      expect(hit.isNegative).toBe(false);
      expect(hit.blueprint?.blueprintId).toBe("bp_test_123");

      // Negative Set (e.g. policy breach or model error)
      const negKey = VariantCache.buildKey("site_01", "adversarial");
      cache.setNegative("site_01", "adversarial", "Prompt injection attempt detected");

      const negHit = cache.get(negKey);
      expect(negHit.hit).toBe(true);
      expect(negHit.isNegative).toBe(true);
      expect(negHit.errorMessage).toContain("Prompt injection");
    });
  });

  describe("AsyncGenerationQueue", () => {
    it("queues and executes background generation jobs with retry backoff", async () => {
      const queue = new AsyncGenerationQueue(storage, {
        concurrency: 1,
        pollIntervalMs: 20,
        maxAttempts: 2,
        baseBackoffMs: 20,
      });

      let attempts = 0;
      queue.registerHandler(async (job) => {
        attempts++;
        if (attempts === 1) {
          throw new Error("Temporary provider rate limit");
        }
        return {
          ...sampleBlueprint,
          blueprintId: `bp_generated_${job.jobId}`,
        };
      });

      const jobId = queue.enqueue({
        siteId: "site_test_01",
        segmentKey: "enterprise",
        prompt: "Generate enterprise landing page",
        priority: "high",
      });

      expect(queue.getJob(jobId)?.status).toBe("pending");

      queue.start();

      // Wait for retry and completion
      await new Promise((resolve) => setTimeout(resolve, 200));

      queue.stop();

      const completed = queue.getJob(jobId);
      expect(completed?.status).toBe("completed");
      expect(completed?.resultBlueprint?.blueprintId).toContain("bp_generated_");
      expect(completed?.attempts).toBe(2);
    });
  });
});
