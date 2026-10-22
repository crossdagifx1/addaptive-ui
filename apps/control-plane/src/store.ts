import type { Blueprint } from "@aui/schema";
import { DEFAULT_POLICY, type Policy } from "@aui/policy";
import { defaultLandingBlueprint } from "@aui/components-landing";
import {
  createAnalyticsPipeline,
  AnalyticsPipeline,
  type AnalyticsEvent,
  type ExperimentReport,
} from "@aui/analytics";
import {
  SQLiteStorage,
  VariantCache,
  AsyncGenerationQueue,
  SpendGovernor,
  WebhookDispatcher,
  GenerationTraceStore,
  signBlueprint,
  type SiteRecord,
  type VariantRecord,
  type VersionHistoryRecord,
  type AuditLogRecord,
  type WebhookSubscription,
  type GenerationTrace,
} from "@aui/storage";
import type { Site, VariantReview, AuditLogEntry, VersionHistoryItem } from "./types.js";

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

// Generate Enterprise B2B Sample Variant
function createEnterpriseSampleVariant(): Blueprint {
  const bp = clone(defaultLandingBlueprint);
  bp.blueprintId = "bp_var_enterprise_b2b";
  bp.segment = "enterprise-b2b";
  bp.meta.generatedBy = "anthropic:claude-3-7-sonnet";
  bp.meta.reasoning = "Tailored headline, trust badges, and executive consultation for Fortune 500 visitors.";
  bp.meta.status = "pending";

  const hero = bp.components.hero;
  if (hero) {
    hero.props.headline = "Enterprise-Grade Adaptive UI with 100% Policy Protection";
    hero.props.subheadline =
      "Deliver bespoke web experiences for global enterprise teams with SOC2 compliance, dedicated VPC hosting, and zero-compromise locked zones.";
    hero.props.primaryCta = { label: "Schedule Executive Architecture Review", action: "navigate:/contact-sales" };
  }

  const banner = bp.components.banner;
  if (banner) {
    banner.props.text = "🏛️ NEW: SOC2 Type II Certified & Enterprise VPC Deployments Now Available";
    banner.props.action = { label: "Read Security Report", href: "/security" };
  }

  return bp;
}

// Generate Developer Speed Sample Variant
function createDeveloperSampleVariant(): Blueprint {
  const bp = clone(defaultLandingBlueprint);
  bp.blueprintId = "bp_var_dev_speed";
  bp.segment = "developer-speed";
  bp.meta.generatedBy = "openai:o3-mini";
  bp.meta.reasoning = "Targeted edge metrics, CLI snippets, and TypeScript performance stats for engineering leads.";
  bp.meta.status = "approved";

  const hero = bp.components.hero;
  if (hero) {
    hero.props.headline = "The Edge-Native Adaptive UI Engine for High-Velocity Teams";
    hero.props.subheadline =
      "Serve personalized user interfaces at sub-15ms edge latency. Zero client-side bloat, declarative JSON blueprints, and instant 1-click rollback.";
    hero.props.primaryCta = { label: "Install CLI: pnpm add @aui/cli", action: "navigate:/docs/cli" };
  }

  return bp;
}

export class ControlPlaneStore {
  public storage: SQLiteStorage;
  public variantCache: VariantCache;
  public generationQueue: AsyncGenerationQueue;
  public spendGovernor: SpendGovernor;
  public webhookDispatcher: WebhookDispatcher;
  public traceStore: GenerationTraceStore;
  private analytics: AnalyticsPipeline;

  constructor(dbPath: string = process.env.AUI_DB_PATH || ":memory:") {
    this.storage = new SQLiteStorage(dbPath);
    this.variantCache = new VariantCache(this.storage);
    this.generationQueue = new AsyncGenerationQueue(this.storage);
    this.spendGovernor = new SpendGovernor();
    this.webhookDispatcher = new WebhookDispatcher();
    this.traceStore = new GenerationTraceStore();

    this.analytics = createAnalyticsPipeline({
      onAutoPause: (report) => {
        this.addAuditLog(report.siteId, "guardrail_autopause", "system:guardrail-monitor", {
          action: "auto_pause_triggered",
          segment: report.segmentKey,
          violations: report.guardrails.violations,
        });
        this.storage.updateVariantStatus(report.variantBlueprintId, "rejected");
        void this.dispatchWebhook(report.siteId, "guardrail.auto_paused", {
          segment: report.segmentKey,
          violations: report.guardrails.violations,
        });
      },
    });

    if (this.storage.listSites().length === 0) {
      this.seedDefaultData();
    }
  }

  private seedDefaultData() {
    const siteId = "site_acme_corp";
    const site: SiteRecord = {
      id: siteId,
      name: "Acme Cloud Platform",
      domain: "acmecloud.io",
      approvalMode: "approve-first",
      apiKey: "aui_live_9f83a2c04e7b89d1",
      monthlySpendCapUsd: 500,
      currentSpendUsd: 64.28,
      activeBlueprintId: defaultLandingBlueprint.blueprintId,
      rolloutPercentage: 100,
      isKillSwitchActive: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    this.storage.createSite(site);

    // Initial policy
    const policy: Policy = clone(DEFAULT_POLICY);
    this.storage.setPolicy(siteId, policy);

    // Initial version history
    const initialVersion: VersionHistoryRecord = {
      id: "ver_canonical_default",
      siteId,
      blueprint: clone(defaultLandingBlueprint),
      segment: "default",
      deployedBy: "system:holdout",
      notes: "Canonical default landing page holdout",
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    };
    this.storage.addVersion(initialVersion);

    // Sample pending variant
    const entVariant = createEnterpriseSampleVariant();
    this.storage.saveVariant({
      id: entVariant.blueprintId,
      siteId,
      segmentKey: "enterprise-b2b",
      status: "pending",
      blueprint: entVariant,
      parentBlueprintId: defaultLandingBlueprint.blueprintId,
      reasoning: entVariant.meta.reasoning || "Optimized for enterprise visitors",
      metrics: {
        latencyMs: 720,
        tokensUsed: 2650,
        costUsd: 0.038,
        validationPassed: true,
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    });

    // Sample approved variant (signed with site key)
    const devVariant = signBlueprint(createDeveloperSampleVariant(), site.apiKey);
    this.storage.saveVariant({
      id: devVariant.blueprintId,
      siteId,
      segmentKey: "developer-speed",
      status: "approved",
      blueprint: devVariant,
      parentBlueprintId: defaultLandingBlueprint.blueprintId,
      reasoning: devVariant.meta.reasoning || "Optimized for developers",
      metrics: {
        latencyMs: 580,
        tokensUsed: 2310,
        costUsd: 0.024,
        validationPassed: true,
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    });

    // Seed realistic experimentation events for developer-speed
    // 400 holdout impressions, 24 conversions (6.0% CR)
    for (let i = 0; i < 400; i++) {
      const evt: AnalyticsEvent = {
        id: `seed_h_${i}`,
        siteId,
        pageId: "landing",
        sessionId: `sess_seed_h_${i}`,
        type: "impression",
        timestamp: new Date(Date.now() - 86400000 + i * 100000).toISOString(),
        group: "holdout",
        segmentKey: "developer-speed",
        blueprintId: defaultLandingBlueprint.blueprintId,
      };
      this.analytics.recordEvent(evt);
    }
    for (let i = 0; i < 24; i++) {
      const evt: AnalyticsEvent = {
        id: `seed_hc_${i}`,
        siteId,
        pageId: "landing",
        sessionId: `sess_seed_h_${i}`,
        type: "conversion",
        timestamp: new Date(Date.now() - 86400000 + i * 100000 + 30000).toISOString(),
        group: "holdout",
        segmentKey: "developer-speed",
        blueprintId: defaultLandingBlueprint.blueprintId,
        goalId: "signup",
      };
      this.analytics.recordEvent(evt);
    }

    // 1000 variant impressions, 92 conversions (9.2% CR -> +53.3% relative lift!)
    for (let i = 0; i < 1000; i++) {
      const evt: AnalyticsEvent = {
        id: `seed_v_${i}`,
        siteId,
        pageId: "landing",
        sessionId: `sess_seed_v_${i}`,
        type: "impression",
        timestamp: new Date(Date.now() - 86400000 + i * 40000).toISOString(),
        group: "variant",
        segmentKey: "developer-speed",
        blueprintId: devVariant.blueprintId,
        properties: { latencyMs: 14 },
      };
      this.analytics.recordEvent(evt);
    }
    for (let i = 0; i < 92; i++) {
      const evt: AnalyticsEvent = {
        id: `seed_vc_${i}`,
        siteId,
        pageId: "landing",
        sessionId: `sess_seed_v_${i}`,
        type: "conversion",
        timestamp: new Date(Date.now() - 86400000 + i * 40000 + 25000).toISOString(),
        group: "variant",
        segmentKey: "developer-speed",
        blueprintId: devVariant.blueprintId,
        goalId: "signup",
      };
      this.analytics.recordEvent(evt);
    }

    // Seed audit logs
    this.storage.addAuditLog({
      id: "audit_1",
      siteId,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      action: "variant_approved",
      actor: "owner@acmecloud.io",
      details: { variantId: devVariant.blueprintId, segment: "developer-speed" },
    });
    this.storage.addAuditLog({
      id: "audit_2",
      siteId,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: "model_generation",
      actor: "system:model-router",
      details: {
        variantId: entVariant.blueprintId,
        model: "anthropic:claude-3-7-sonnet",
        validation: "passed",
        lockedZonesProtected: true,
      },
    });
  }

  // Sites
  listSites(): Site[] {
    return this.storage.listSites() as Site[];
  }

  getSite(id: string): Site | undefined {
    const site = this.storage.getSite(id);
    return site ? (site as Site) : undefined;
  }

  createSite(name: string, domain: string, approvalMode: Site["approvalMode"] = "approve-first"): Site {
    const id = `site_${Math.random().toString(36).substring(2, 9)}`;
    const apiKey = `aui_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 10)}`;
    const site: Site = {
      id,
      name,
      domain,
      approvalMode,
      apiKey,
      monthlySpendCapUsd: 500,
      currentSpendUsd: 0,
      activeBlueprintId: defaultLandingBlueprint.blueprintId,
      rolloutPercentage: 100,
      isKillSwitchActive: false,
      createdAt: new Date().toISOString(),
    };
    this.storage.createSite(site);
    this.storage.setPolicy(id, clone(DEFAULT_POLICY));
    this.storage.addVersion({
      id: `ver_init_${id}`,
      siteId: id,
      blueprint: clone(defaultLandingBlueprint),
      segment: "default",
      deployedBy: "system:init",
      notes: "Initial default blueprint",
      createdAt: new Date().toISOString(),
    });
    return site;
  }

  setRolloutPercentage(siteId: string, percentage: number, actor = "admin"): Site | undefined {
    const site = this.getSite(siteId);
    if (!site) return undefined;
    const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
    this.storage.updateSite(siteId, { rolloutPercentage: clamped });
    this.addAuditLog(siteId, "canary_updated", actor, { rolloutPercentage: clamped });
    return this.getSite(siteId);
  }

  setKillSwitch(siteId: string, active: boolean, actor = "admin"): Site | undefined {
    const site = this.getSite(siteId);
    if (!site) return undefined;
    this.storage.updateSite(siteId, { isKillSwitchActive: active });
    this.addAuditLog(siteId, "killswitch_toggled", actor, { isKillSwitchActive: active });
    return this.getSite(siteId);
  }

  // Policy
  getPolicy(siteId: string): Policy {
    return this.storage.getPolicy(siteId) || clone(DEFAULT_POLICY);
  }

  updatePolicy(siteId: string, updates: Partial<Policy>, spendCapUsd?: number): Policy {
    const current = this.getPolicy(siteId);
    const updated: Policy = { ...current, ...updates };
    this.storage.setPolicy(siteId, updated);

    if (spendCapUsd !== undefined) {
      this.storage.updateSite(siteId, { monthlySpendCapUsd: spendCapUsd });
    }

    this.addAuditLog(siteId, "policy_updated", "admin", { updates, spendCapUsd });
    return updated;
  }

  // Variants
  listVariants(siteId: string): VariantReview[] {
    return this.storage.listVariants(siteId) as VariantReview[];
  }

  getVariant(id: string): VariantReview | undefined {
    const v = this.storage.getVariant(id);
    return v ? (v as VariantReview) : undefined;
  }

  approveVariant(variantId: string, actor = "admin"): VariantReview | undefined {
    const v = this.storage.getVariant(variantId);
    if (!v) return undefined;

    // Cryptographically sign the blueprint upon human approval
    const site = this.storage.getSite(v.siteId);
    const signedBlueprint = site ? signBlueprint(v.blueprint, site.apiKey) : v.blueprint;

    v.status = "approved";
    v.blueprint = signedBlueprint;
    this.storage.saveVariant(v);

    // Add to version history
    this.storage.addVersion({
      id: `ver_${Date.now()}`,
      siteId: v.siteId,
      blueprint: signedBlueprint,
      segment: v.segmentKey,
      deployedBy: actor,
      notes: `Approved variant for segment "${v.segmentKey}"`,
      createdAt: new Date().toISOString(),
    });

    // Update site active blueprint
    if (site) {
      this.storage.updateSite(v.siteId, { activeBlueprintId: signedBlueprint.blueprintId });
    }

    // Cache variant in high-speed cache
    this.variantCache.set(v.siteId, v.segmentKey, signedBlueprint);

    this.addAuditLog(v.siteId, "variant_approved", actor, {
      variantId,
      segment: v.segmentKey,
      signed: Boolean(signedBlueprint.meta?.signature),
    });
    return v as VariantReview;
  }

  rejectVariant(variantId: string, actor = "admin"): VariantReview | undefined {
    const v = this.storage.getVariant(variantId);
    if (!v) return undefined;
    v.status = "rejected";
    this.storage.saveVariant(v);

    // Negative cache to prevent immediate re-attempts
    this.variantCache.setNegative(v.siteId, v.segmentKey, "Rejected by reviewer");

    this.addAuditLog(v.siteId, "variant_rejected", actor, { variantId });
    return v as VariantReview;
  }

  rollbackVersion(siteId: string, versionId: string, actor = "admin"): VersionHistoryItem | undefined {
    const history = this.storage.listVersions(siteId);
    const target = history.find((h) => h.id === versionId || (h as any).versionId === versionId);
    if (!target) return undefined;

    const rollbackItem: VersionHistoryRecord = {
      id: `ver_rollback_${Date.now()}`,
      siteId,
      blueprint: clone(target.blueprint),
      segment: target.segment,
      deployedBy: actor,
      notes: `Rolled back to version ${versionId} (${target.notes})`,
      createdAt: new Date().toISOString(),
    };
    this.storage.addVersion(rollbackItem);

    this.storage.updateSite(siteId, { activeBlueprintId: target.blueprint.blueprintId });

    this.addAuditLog(siteId, "rollback", actor, { targetVersionId: versionId, segment: target.segment });
    return {
      versionId: rollbackItem.id,
      siteId: rollbackItem.siteId,
      timestamp: rollbackItem.createdAt,
      blueprint: rollbackItem.blueprint,
      segment: rollbackItem.segment,
      deployedBy: rollbackItem.deployedBy,
      notes: rollbackItem.notes,
    };
  }

  // Version History
  getVersionHistory(siteId: string): VersionHistoryItem[] {
    return this.storage.listVersions(siteId).map((v) => ({
      versionId: v.id,
      siteId: v.siteId,
      timestamp: v.createdAt,
      blueprint: v.blueprint,
      segment: v.segment,
      deployedBy: v.deployedBy,
      notes: v.notes,
    }));
  }

  // Audit Logs
  getAuditLogs(siteId?: string): AuditLogEntry[] {
    return this.storage.listAuditLogs(siteId) as AuditLogEntry[];
  }

  addAuditLog(
    siteId: string,
    action: AuditLogEntry["action"],
    actor: string,
    details: Record<string, unknown>
  ) {
    this.storage.addAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      siteId,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
    });
  }

  // Analytics & Experimentation
  recordAnalyticsEvent(event: AnalyticsEvent) {
    this.analytics.recordEvent(event);
    this.storage.recordAnalyticsEvent({
      id: event.id,
      siteId: event.siteId,
      pageId: event.pageId,
      sessionId: event.sessionId,
      eventType: event.type,
      groupName: event.group,
      segmentKey: event.segmentKey,
      blueprintId: event.blueprintId,
      goalId: event.goalId,
      properties: event.properties,
      timestamp: event.timestamp,
    });
  }

  getExperimentReport(siteId: string, segmentKey = "developer-speed"): ExperimentReport {
    const variants = this.storage.listVariants(siteId);
    const variant = variants.find((v) => v.segmentKey === segmentKey);
    const variantBlueprintId = variant ? variant.blueprint.blueprintId : "bp_var_dev_speed";

    return this.analytics.getReport({
      siteId,
      pageId: "landing",
      segmentKey,
      variantBlueprintId,
      holdoutBlueprintId: defaultLandingBlueprint.blueprintId,
    });
  }

  // Budget & Spend Governor
  getBudget(siteId: string) {
    return this.spendGovernor.getBudget(siteId);
  }

  setMonthlyCap(siteId: string, capUsd: number, warningThreshold = 80) {
    const budget = this.spendGovernor.setMonthlyCap(siteId, capUsd, warningThreshold);
    this.addAuditLog(siteId, "policy_update", "admin", { monthlyCapUsd: capUsd });
    return budget;
  }

  recordSpend(siteId: string, amountUsd: number) {
    const result = this.spendGovernor.recordSpend(siteId, amountUsd);
    if (result.warningTriggered) {
      void this.dispatchWebhook(siteId, "spend.threshold_reached", {
        percentUsed: result.percentUsed,
        currentSpendUsd: result.currentSpendUsd,
      });
    }
    return result;
  }

  // Webhooks
  listWebhooks(siteId: string): WebhookSubscription[] {
    return this.webhookDispatcher.getSubscriptions(siteId);
  }

  addWebhook(siteId: string, url: string, events: any[], secret?: string) {
    const sub: WebhookSubscription = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      siteId,
      url,
      secret: secret || `whsec_${Math.random().toString(36).substring(2, 12)}`,
      events,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.webhookDispatcher.registerSubscription(sub);
    this.addAuditLog(siteId, "policy_update", "admin", { webhookRegistered: url });
    return sub;
  }

  async dispatchWebhook(siteId: string, type: any, payload: Record<string, unknown>) {
    return this.webhookDispatcher.dispatch({
      id: `evt_wh_${Date.now()}`,
      siteId,
      type,
      timestamp: String(Math.floor(Date.now() / 1000)),
      payload,
    });
  }

  // AI Generation Traces & Replay
  listTraces(siteId: string) {
    return this.traceStore.listTraces(siteId);
  }

  replayTrace(traceId: string) {
    return this.traceStore.replayTrace(traceId);
  }
}

