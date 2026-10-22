import type { Blueprint } from "@aui/schema";
import type { Policy } from "@aui/policy";

export type ApprovalMode = "auto-apply" | "suggest-only" | "approve-first";
export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export interface TeamMember {
  id: string;
  siteId: string;
  email: string;
  name: string;
  role: TeamRole;
  createdAt: string;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  approvalMode: ApprovalMode;
  apiKey: string;
  monthlySpendCapUsd: number;
  currentSpendUsd: number;
  activeBlueprintId: string;
  rolloutPercentage: number;
  isKillSwitchActive: boolean;
  createdAt: string;
}

export interface VariantReview {
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

export interface AuditLogEntry {
  id: string;
  siteId: string;
  timestamp: string;
  action:
    | "model_generation"
    | "variant_approved"
    | "variant_rejected"
    | "rollback"
    | "policy_updated"
    | "guardrail_autopause"
    | "canary_updated"
    | "killswitch_toggled"
    | "preview_generated";
  actor: string;
  details: Record<string, unknown>;
}

export interface VersionHistoryItem {
  versionId: string;
  siteId: string;
  timestamp: string;
  blueprint: Blueprint;
  segment: string;
  deployedBy: string;
  notes: string;
}

