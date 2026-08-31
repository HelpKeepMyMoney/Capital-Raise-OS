import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const API_KEY_PREFIX = "cpin_live_";

/** Raw secret shown once on create; never log or persist outside keyHash. */
export function generateOrgApiKeySecret(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashOrgApiKey(raw: string): string {
  return createHash("sha256").update(raw.trim(), "utf8").digest("hex");
}

/** Display prefix for Settings list (not sufficient to authenticate). */
export function orgApiKeyDisplayPrefix(raw: string): string {
  const t = raw.trim();
  return t.length <= 16 ? t : t.slice(0, 16);
}

export function isOrgApiKeyFormat(raw: string): boolean {
  return raw.trim().startsWith(API_KEY_PREFIX) && raw.trim().length > API_KEY_PREFIX.length + 8;
}

export function safeCompareKeyHash(storedHex: string, candidateHex: string): boolean {
  try {
    const a = Buffer.from(storedHex, "hex");
    const b = Buffer.from(candidateHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
