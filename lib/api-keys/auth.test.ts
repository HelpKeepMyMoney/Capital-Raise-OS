import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { extractApiKeyFromRequest } from "@/lib/api-keys/auth";
import { generateOrgApiKeySecret } from "@/lib/api-keys/token";

describe("extractApiKeyFromRequest", () => {
  it("reads Bearer token", () => {
    const secret = generateOrgApiKeySecret();
    const req = new NextRequest("http://localhost/api/v1/org", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(extractApiKeyFromRequest(req)).toBe(secret);
  });

  it("reads X-API-Key header", () => {
    const secret = generateOrgApiKeySecret();
    const req = new NextRequest("http://localhost/api/v1/org", {
      headers: { "X-API-Key": secret },
    });
    expect(extractApiKeyFromRequest(req)).toBe(secret);
  });

  it("returns null when missing", () => {
    const req = new NextRequest("http://localhost/api/v1/org");
    expect(extractApiKeyFromRequest(req)).toBeNull();
  });
});
