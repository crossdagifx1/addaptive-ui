import * as crypto from "node:crypto";
import type { Blueprint } from "@aui/schema";

/**
 * Creates a deterministic, canonical JSON representation of a blueprint
 * excluding the signature itself.
 */
export function canonicalizeBlueprint(blueprint: Blueprint): string {
  const clone = JSON.parse(JSON.stringify(blueprint));
  if (clone.meta && "signature" in clone.meta) {
    delete clone.meta.signature;
  }

  function sortObject(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortObject);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = sortObject(obj[key]);
    }
    return result;
  }

  return JSON.stringify(sortObject(clone));
}

/**
 * Signs a blueprint with a site secret key using HMAC-SHA256.
 * Attaches the computed hex signature to blueprint.meta.signature.
 */
export function signBlueprint(blueprint: Blueprint, secretKey: string): Blueprint {
  const canonical = canonicalizeBlueprint(blueprint);
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(canonical, "utf8");
  const signature = `sig_sha256_${hmac.digest("hex")}`;

  return {
    ...blueprint,
    meta: {
      ...blueprint.meta,
      signature,
    },
  };
}

/**
 * Verifies a blueprint's cryptographic HMAC-SHA256 signature against the site secret key.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyBlueprintSignature(
  blueprint: Blueprint,
  secretKey: string
): { valid: boolean; reason?: string } {
  const rawSignature = (blueprint.meta as any)?.signature;
  if (!rawSignature || typeof rawSignature !== "string") {
    return { valid: false, reason: "Missing cryptographic signature on blueprint" };
  }

  if (!rawSignature.startsWith("sig_sha256_")) {
    return { valid: false, reason: "Unsupported signature algorithm or format" };
  }

  const expectedHmac = crypto.createHmac("sha256", secretKey);
  expectedHmac.update(canonicalizeBlueprint(blueprint), "utf8");
  const expectedSig = `sig_sha256_${expectedHmac.digest("hex")}`;

  const sigBuf = Buffer.from(rawSignature, "utf8");
  const expBuf = Buffer.from(expectedSig, "utf8");

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: "Signature mismatch: blueprint content was modified or signed with invalid key" };
  }

  return { valid: true };
}
