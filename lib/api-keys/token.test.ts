import { describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  generateOrgApiKeySecret,
  hashOrgApiKey,
  isOrgApiKeyFormat,
  orgApiKeyDisplayPrefix,
  safeCompareKeyHash,
} from "@/lib/api-keys/token";

describe("org API key token helpers", () => {
  it("generates keys with cpin_live prefix", () => {
    const secret = generateOrgApiKeySecret();
    expect(secret.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(isOrgApiKeyFormat(secret)).toBe(true);
  });

  it("hashes deterministically without storing raw secret", () => {
    const secret = generateOrgApiKeySecret();
    const a = hashOrgApiKey(secret);
    const b = hashOrgApiKey(`  ${secret}  `);
    expect(a).toBe(b);
    expect(a).not.toContain("cpin_live");
    expect(a.length).toBe(64);
  });

  it("compares hashes in constant time", () => {
    const secret = generateOrgApiKeySecret();
    const hash = hashOrgApiKey(secret);
    expect(safeCompareKeyHash(hash, hash)).toBe(true);
    expect(safeCompareKeyHash(hash, hashOrgApiKey(generateOrgApiKeySecret()))).toBe(false);
  });

  it("builds display prefix for list UI", () => {
    const secret = generateOrgApiKeySecret();
    const prefix = orgApiKeyDisplayPrefix(secret);
    expect(prefix.length).toBeLessThanOrEqual(16);
    expect(secret.startsWith(prefix)).toBe(true);
  });
});
