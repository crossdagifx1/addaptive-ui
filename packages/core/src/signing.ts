import type { Blueprint } from '@aui/schema';

/**
 * Creates a deterministic, canonical JSON string of a blueprint
 * excluding the signature itself and sorting keys recursively.
 */
export function canonicalizeBlueprint(blueprint: Blueprint): string {
  const clone = JSON.parse(JSON.stringify(blueprint));
  if (clone.meta && 'signature' in clone.meta) {
    delete clone.meta.signature;
  }

  function sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
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
 * Portable HMAC-SHA256 signature verification using Web Crypto API (supported in Browser, Node 18+, Edge).
 */
export async function verifyBlueprintSignature(
  blueprint: Blueprint,
  secretKey: string
): Promise<{ valid: boolean; reason?: string }> {
  const rawSignature = (blueprint.meta as any)?.signature;
  if (!rawSignature || typeof rawSignature !== 'string') {
    return { valid: false, reason: 'Missing cryptographic signature on blueprint' };
  }

  if (!rawSignature.startsWith('sig_sha256_')) {
    return { valid: false, reason: 'Unsupported signature algorithm or format' };
  }

  try {
    const canonical = canonicalizeBlueprint(blueprint);
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(canonical));
    const hex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const expectedSig = `sig_sha256_${hex}`;

    // Constant-time comparison
    if (rawSignature.length !== expectedSig.length) {
      return { valid: false, reason: 'Signature mismatch: blueprint content was modified or signed with invalid key' };
    }

    let mismatch = 0;
    for (let i = 0; i < rawSignature.length; i++) {
      mismatch |= rawSignature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return { valid: false, reason: 'Signature mismatch: blueprint content was modified or signed with invalid key' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Verification failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
