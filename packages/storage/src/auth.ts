import * as crypto from "node:crypto";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type AuthAction =
  | "view"
  | "edit_policy"
  | "approve_variant"
  | "rollback"
  | "manage_team"
  | "toggle_killswitch"
  | "update_canary"
  | "create_site";

export interface UserSession {
  userId: string;
  siteId: string;
  email: string;
  role: TeamRole;
}

const ROLE_PERMISSIONS: Record<TeamRole, Set<AuthAction>> = {
  owner: new Set([
    "view",
    "edit_policy",
    "approve_variant",
    "rollback",
    "manage_team",
    "toggle_killswitch",
    "update_canary",
    "create_site",
  ]),
  admin: new Set([
    "view",
    "edit_policy",
    "approve_variant",
    "rollback",
    "toggle_killswitch",
    "update_canary",
  ]),
  editor: new Set([
    "view",
    "approve_variant",
  ]),
  viewer: new Set([
    "view",
  ]),
};

/**
 * Checks if a given team role is authorized to perform an action.
 */
export function hasPermission(role: TeamRole, action: AuthAction): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.has(action) : false;
}

/**
 * Generates a cryptographically strong live API key.
 */
export function generateApiKey(prefix = "aui_live"): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${randomBytes}`;
}

/**
 * Computes a SHA-256 hash of an API key for safe storage.
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey, "utf8").digest("hex");
}

/**
 * Verifies an incoming API key against a known key using constant-time comparison.
 */
export function verifyApiKey(providedKey: string, expectedKey: string): boolean {
  if (!providedKey || !expectedKey) return false;
  const provBuf = Buffer.from(providedKey, "utf8");
  const expBuf = Buffer.from(expectedKey, "utf8");
  if (provBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(provBuf, expBuf);
}
