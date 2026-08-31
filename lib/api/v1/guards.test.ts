import { describe, expect, it } from "vitest";
import { parseDealStatusWrite, rejectForbiddenApiActions } from "@/lib/api/v1/guards";

describe("v1 API guards", () => {
  it("allows publish via status=active", () => {
    const r = parseDealStatusWrite("active");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.status).toBe("active");
  });

  it("allows draft and omitted status", () => {
    expect(parseDealStatusWrite("draft").ok).toBe(true);
    expect(parseDealStatusWrite(undefined).ok).toBe(true);
  });

  it("rejects unknown status", () => {
    const r = parseDealStatusWrite("live");
    expect(r.ok).toBe(false);
  });

  it("rejects invite and outreach body fields", () => {
    const r = rejectForbiddenApiActions({ inviteInvestor: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/not available via API/i);
  });
});
