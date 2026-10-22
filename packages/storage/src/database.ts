import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
import * as fs from "node:fs";
import * as path from "node:path";
import type { Blueprint } from "@aui/schema";
import type { Policy } from "@aui/policy";
import type { TeamRole } from "./auth.js";

export interface SiteRecord {
  id: string;
  name: string;
  domain: string;
  approvalMode: "auto-apply" | "suggest-only" | "approve-first";
  apiKey: string;
  monthlySpendCapUsd: number;
  currentSpendUsd: number;
  activeBlueprintId: string;
  rolloutPercentage: number;
  isKillSwitchActive: boolean;
  createdAt: string;
}

export interface VariantRecord {
  id: string;
  siteId: string;
  segmentKey: string;
  status: "pending" | "approved" | "rejected";
  blueprint: Blueprint;
  parentBlueprintId: string;
  reasoning: string;
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    costUsd: number;
    validationPassed: boolean;
  };
  createdAt: string;
}

export interface VersionHistoryRecord {
  id: string;
  siteId: string;
  blueprint: Blueprint;
  segment: string;
  deployedBy: string;
  notes: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  siteId: string;
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
}

export interface AnalyticsEventRecord {
  id: string;
  siteId: string;
  pageId: string;
  sessionId: string;
  eventType: string;
  groupName: "variant" | "holdout";
  segmentKey: string;
  blueprintId: string;
  goalId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

export interface UserRecord {
  id: string;
  siteId: string;
  email: string;
  name: string;
  role: TeamRole;
  apiToken: string;
  createdAt: string;
}

export interface CacheEntry {
  cacheKey: string;
  siteId: string;
  segmentKey: string;
  blueprint?: Blueprint;
  errorMessage?: string;
  isNegative: boolean;
  expiresAt: number;
  createdAt: string;
}

export interface QueueJobRecord {
  jobId: string;
  siteId: string;
  segmentKey: string;
  priority: "high" | "normal" | "low";
  status: "pending" | "running" | "completed" | "failed";
  prompt: string;
  resultBlueprint?: Blueprint;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  createdAt: string;
  updatedAt: string;
}

export class SQLiteStorage {
  public db: any;

  constructor(dbPath: string = ":memory:") {
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        approval_mode TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        monthly_spend_cap_usd REAL NOT NULL,
        current_spend_usd REAL NOT NULL,
        active_blueprint_id TEXT NOT NULL,
        rollout_percentage INTEGER NOT NULL DEFAULT 100,
        is_kill_switch_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS policies (
        site_id TEXT PRIMARY KEY,
        policy_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id)
      );

      CREATE TABLE IF NOT EXISTS variants (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        segment_key TEXT NOT NULL,
        status TEXT NOT NULL,
        blueprint_json TEXT NOT NULL,
        parent_blueprint_id TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id)
      );

      CREATE TABLE IF NOT EXISTS version_history (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        blueprint_json TEXT NOT NULL,
        segment TEXT NOT NULL,
        deployed_by TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        details_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        group_name TEXT NOT NULL,
        segment_key TEXT NOT NULL,
        blueprint_id TEXT NOT NULL,
        goal_id TEXT,
        properties_json TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        api_token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id)
      );

      CREATE TABLE IF NOT EXISTS variant_cache (
        cache_key TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        segment_key TEXT NOT NULL,
        blueprint_json TEXT,
        error_message TEXT,
        is_negative INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS generation_queue (
        job_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        segment_key TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        prompt TEXT NOT NULL,
        result_blueprint_json TEXT,
        error_message TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        next_run_at INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  // Sites
  createSite(site: SiteRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO sites (
        id, name, domain, approval_mode, api_key, monthly_spend_cap_usd,
        current_spend_usd, active_blueprint_id, rollout_percentage, is_kill_switch_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      site.id,
      site.name,
      site.domain,
      site.approvalMode,
      site.apiKey,
      site.monthlySpendCapUsd,
      site.currentSpendUsd,
      site.activeBlueprintId,
      site.rolloutPercentage,
      site.isKillSwitchActive ? 1 : 0,
      site.createdAt
    );
  }

  getSite(id: string): SiteRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM sites WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      approvalMode: row.approval_mode,
      apiKey: row.api_key,
      monthlySpendCapUsd: row.monthly_spend_cap_usd,
      currentSpendUsd: row.current_spend_usd,
      activeBlueprintId: row.active_blueprint_id,
      rolloutPercentage: row.rollout_percentage,
      isKillSwitchActive: Boolean(row.is_kill_switch_active),
      createdAt: row.created_at,
    };
  }

  getSiteByApiKey(apiKey: string): SiteRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM sites WHERE api_key = ?`);
    const row = stmt.get(apiKey) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      approvalMode: row.approval_mode,
      apiKey: row.api_key,
      monthlySpendCapUsd: row.monthly_spend_cap_usd,
      currentSpendUsd: row.current_spend_usd,
      activeBlueprintId: row.active_blueprint_id,
      rolloutPercentage: row.rollout_percentage,
      isKillSwitchActive: Boolean(row.is_kill_switch_active),
      createdAt: row.created_at,
    };
  }

  listSites(): SiteRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM sites ORDER BY created_at DESC`);
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      approvalMode: row.approval_mode,
      apiKey: row.api_key,
      monthlySpendCapUsd: row.monthly_spend_cap_usd,
      currentSpendUsd: row.current_spend_usd,
      activeBlueprintId: row.active_blueprint_id,
      rolloutPercentage: row.rollout_percentage,
      isKillSwitchActive: Boolean(row.is_kill_switch_active),
      createdAt: row.created_at,
    }));
  }

  updateSite(id: string, updates: Partial<SiteRecord>): void {
    const current = this.getSite(id);
    if (!current) return;
    const merged = { ...current, ...updates };
    const stmt = this.db.prepare(`
      UPDATE sites SET
        name = ?, domain = ?, approval_mode = ?, api_key = ?,
        monthly_spend_cap_usd = ?, current_spend_usd = ?,
        active_blueprint_id = ?, rollout_percentage = ?,
        is_kill_switch_active = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.name,
      merged.domain,
      merged.approvalMode,
      merged.apiKey,
      merged.monthlySpendCapUsd,
      merged.currentSpendUsd,
      merged.activeBlueprintId,
      merged.rolloutPercentage,
      merged.isKillSwitchActive ? 1 : 0,
      id
    );
  }

  // Policies
  getPolicy(siteId: string): Policy | null {
    const stmt = this.db.prepare(`SELECT policy_json FROM policies WHERE site_id = ?`);
    const row = stmt.get(siteId) as any;
    if (!row) return null;
    return JSON.parse(row.policy_json);
  }

  setPolicy(siteId: string, policy: Policy): void {
    const stmt = this.db.prepare(`
      INSERT INTO policies (site_id, policy_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET
        policy_json = excluded.policy_json,
        updated_at = excluded.updated_at
    `);
    stmt.run(siteId, JSON.stringify(policy), new Date().toISOString());
  }

  // Variants
  saveVariant(v: VariantRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO variants (
        id, site_id, segment_key, status, blueprint_json,
        parent_blueprint_id, reasoning, metrics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        blueprint_json = excluded.blueprint_json,
        reasoning = excluded.reasoning,
        metrics_json = excluded.metrics_json
    `);
    stmt.run(
      v.id,
      v.siteId,
      v.segmentKey,
      v.status,
      JSON.stringify(v.blueprint),
      v.parentBlueprintId,
      v.reasoning,
      JSON.stringify(v.metrics),
      v.createdAt
    );
  }

  getVariant(id: string): VariantRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM variants WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      status: row.status,
      blueprint: JSON.parse(row.blueprint_json),
      parentBlueprintId: row.parent_blueprint_id,
      reasoning: row.reasoning,
      metrics: JSON.parse(row.metrics_json),
      createdAt: row.created_at,
    };
  }

  listVariants(siteId: string): VariantRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM variants WHERE site_id = ? ORDER BY created_at DESC`);
    const rows = stmt.all(siteId) as any[];
    return rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      status: row.status,
      blueprint: JSON.parse(row.blueprint_json),
      parentBlueprintId: row.parent_blueprint_id,
      reasoning: row.reasoning,
      metrics: JSON.parse(row.metrics_json),
      createdAt: row.created_at,
    }));
  }

  updateVariantStatus(id: string, status: "pending" | "approved" | "rejected"): void {
    const stmt = this.db.prepare(`UPDATE variants SET status = ? WHERE id = ?`);
    stmt.run(status, id);
  }

  // Version History
  addVersion(item: VersionHistoryRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO version_history (id, site_id, blueprint_json, segment, deployed_by, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      item.siteId,
      JSON.stringify(item.blueprint),
      item.segment,
      item.deployedBy,
      item.notes,
      item.createdAt
    );
  }

  listVersions(siteId: string): VersionHistoryRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM version_history WHERE site_id = ? ORDER BY created_at DESC`);
    const rows = stmt.all(siteId) as any[];
    return rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      blueprint: JSON.parse(row.blueprint_json),
      segment: row.segment,
      deployedBy: row.deployed_by,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  getVersion(id: string): VersionHistoryRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM version_history WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      blueprint: JSON.parse(row.blueprint_json),
      segment: row.segment,
      deployedBy: row.deployed_by,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  // Audit Logs
  addAuditLog(entry: AuditLogRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, site_id, timestamp, action, actor, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.siteId,
      entry.timestamp,
      entry.action,
      entry.actor,
      JSON.stringify(entry.details)
    );
  }

  listAuditLogs(siteId?: string, limit = 100): AuditLogRecord[] {
    const query = siteId
      ? `SELECT * FROM audit_logs WHERE site_id = ? ORDER BY timestamp DESC LIMIT ?`
      : `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`;
    const stmt = this.db.prepare(query);
    const rows = (siteId ? stmt.all(siteId, limit) : stmt.all(limit)) as any[];
    return rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      timestamp: row.timestamp,
      action: row.action,
      actor: row.actor,
      details: JSON.parse(row.details_json),
    }));
  }

  // Analytics Events
  recordAnalyticsEvent(event: AnalyticsEventRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO analytics_events (
        id, site_id, page_id, session_id, event_type, group_name,
        segment_key, blueprint_id, goal_id, properties_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.siteId,
      event.pageId,
      event.sessionId,
      event.eventType,
      event.groupName,
      event.segmentKey,
      event.blueprintId,
      event.goalId || null,
      event.properties ? JSON.stringify(event.properties) : null,
      event.timestamp
    );
  }

  listAnalyticsEvents(siteId: string, sinceTimestamp?: string): AnalyticsEventRecord[] {
    const query = sinceTimestamp
      ? `SELECT * FROM analytics_events WHERE site_id = ? AND timestamp >= ? ORDER BY timestamp ASC`
      : `SELECT * FROM analytics_events WHERE site_id = ? ORDER BY timestamp ASC`;
    const stmt = this.db.prepare(query);
    const rows = (sinceTimestamp ? stmt.all(siteId, sinceTimestamp) : stmt.all(siteId)) as any[];
    return rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      pageId: row.page_id,
      sessionId: row.session_id,
      eventType: row.event_type,
      groupName: row.group_name as "variant" | "holdout",
      segmentKey: row.segment_key,
      blueprintId: row.blueprint_id,
      goalId: row.goal_id || undefined,
      properties: row.properties_json ? JSON.parse(row.properties_json) : undefined,
      timestamp: row.timestamp,
    }));
  }

  // Users & Team
  addUser(user: UserRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, site_id, email, name, role, api_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user.id, user.siteId, user.email, user.name, user.role, user.apiToken, user.createdAt);
  }

  listUsers(siteId: string): UserRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE site_id = ? ORDER BY created_at ASC`);
    const rows = stmt.all(siteId) as any[];
    return rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      email: row.email,
      name: row.name,
      role: row.role as TeamRole,
      apiToken: row.api_token,
      createdAt: row.created_at,
    }));
  }

  getUserByToken(token: string): UserRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE api_token = ?`);
    const row = stmt.get(token) as any;
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      email: row.email,
      name: row.name,
      role: row.role as TeamRole,
      apiToken: row.api_token,
      createdAt: row.created_at,
    };
  }

  // Cache
  setCacheEntry(entry: CacheEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO variant_cache (
        cache_key, site_id, segment_key, blueprint_json, error_message,
        is_negative, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        blueprint_json = excluded.blueprint_json,
        error_message = excluded.error_message,
        is_negative = excluded.is_negative,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `);
    stmt.run(
      entry.cacheKey,
      entry.siteId,
      entry.segmentKey,
      entry.blueprint ? JSON.stringify(entry.blueprint) : null,
      entry.errorMessage || null,
      entry.isNegative ? 1 : 0,
      entry.expiresAt,
      entry.createdAt
    );
  }

  getCacheEntry(cacheKey: string): CacheEntry | null {
    const stmt = this.db.prepare(`SELECT * FROM variant_cache WHERE cache_key = ?`);
    const row = stmt.get(cacheKey) as any;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      this.deleteCacheEntry(cacheKey);
      return null;
    }
    return {
      cacheKey: row.cache_key,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      blueprint: row.blueprint_json ? JSON.parse(row.blueprint_json) : undefined,
      errorMessage: row.error_message || undefined,
      isNegative: Boolean(row.is_negative),
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  deleteCacheEntry(cacheKey: string): void {
    const stmt = this.db.prepare(`DELETE FROM variant_cache WHERE cache_key = ?`);
    stmt.run(cacheKey);
  }

  // Generation Queue
  enqueueJob(job: QueueJobRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO generation_queue (
        job_id, site_id, segment_key, priority, status, prompt,
        result_blueprint_json, error_message, attempts, max_attempts,
        next_run_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.jobId,
      job.siteId,
      job.segmentKey,
      job.priority,
      job.status,
      job.prompt,
      job.resultBlueprint ? JSON.stringify(job.resultBlueprint) : null,
      job.errorMessage || null,
      job.attempts,
      job.maxAttempts,
      job.nextRunAt,
      job.createdAt,
      job.updatedAt
    );
  }

  claimNextJob(): QueueJobRecord | null {
    const now = Date.now();
    // Claim highest priority job whose next_run_at is <= now and status is pending
    const stmt = this.db.prepare(`
      SELECT * FROM generation_queue
      WHERE status = 'pending' AND next_run_at <= ?
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END ASC,
        created_at ASC
      LIMIT 1
    `);
    const row = stmt.get(now) as any;
    if (!row) return null;

    // Transition to running
    const updateStmt = this.db.prepare(`
      UPDATE generation_queue
      SET status = 'running', attempts = attempts + 1, updated_at = ?
      WHERE job_id = ?
    `);
    updateStmt.run(new Date().toISOString(), row.job_id);

    return {
      jobId: row.job_id,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      priority: row.priority,
      status: "running",
      prompt: row.prompt,
      resultBlueprint: row.result_blueprint_json ? JSON.parse(row.result_blueprint_json) : undefined,
      errorMessage: row.error_message || undefined,
      attempts: row.attempts + 1,
      maxAttempts: row.max_attempts,
      nextRunAt: row.next_run_at,
      createdAt: row.created_at,
      updatedAt: new Date().toISOString(),
    };
  }

  updateJob(jobId: string, updates: Partial<QueueJobRecord>): void {
    const current = this.getJob(jobId);
    if (!current) return;
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const stmt = this.db.prepare(`
      UPDATE generation_queue SET
        status = ?,
        result_blueprint_json = ?,
        error_message = ?,
        attempts = ?,
        next_run_at = ?,
        updated_at = ?
      WHERE job_id = ?
    `);
    stmt.run(
      merged.status,
      merged.resultBlueprint ? JSON.stringify(merged.resultBlueprint) : null,
      merged.errorMessage || null,
      merged.attempts,
      merged.nextRunAt,
      merged.updatedAt,
      jobId
    );
  }

  getJob(jobId: string): QueueJobRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM generation_queue WHERE job_id = ?`);
    const row = stmt.get(jobId) as any;
    if (!row) return null;
    return {
      jobId: row.job_id,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      priority: row.priority,
      status: row.status,
      prompt: row.prompt,
      resultBlueprint: row.result_blueprint_json ? JSON.parse(row.result_blueprint_json) : undefined,
      errorMessage: row.error_message || undefined,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRunAt: row.next_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listJobs(siteId?: string): QueueJobRecord[] {
    const query = siteId
      ? `SELECT * FROM generation_queue WHERE site_id = ? ORDER BY created_at DESC LIMIT 50`
      : `SELECT * FROM generation_queue ORDER BY created_at DESC LIMIT 50`;
    const stmt = this.db.prepare(query);
    const rows = (siteId ? stmt.all(siteId) : stmt.all()) as any[];
    return rows.map((row) => ({
      jobId: row.job_id,
      siteId: row.site_id,
      segmentKey: row.segment_key,
      priority: row.priority,
      status: row.status,
      prompt: row.prompt,
      resultBlueprint: row.result_blueprint_json ? JSON.parse(row.result_blueprint_json) : undefined,
      errorMessage: row.error_message || undefined,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRunAt: row.next_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
