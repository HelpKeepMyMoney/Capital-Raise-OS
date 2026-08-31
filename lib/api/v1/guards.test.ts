import { describe, expect, it } from "vitest";
import { rejectDealStatusWrite, rejectForbiddenApiActions } from "@/lib/api/v1/guards";

describe("v1 API guards", () => {
  it("rejects publish via status=active", () => {
    const r = rejectDealStatusWrite("active");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/not allowed/i);
  });

  it("allows draft status", () => {
    expect(rejectDealStatusWrite("draft").ok).toBe(true);
    expect(rejectDealStatusWrite(undefined).ok).toBe(true);
  });

  it("rejects invite and outreach body fields", () => {
    const r = rejectForbiddenApiActions({ inviteInvestor: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/not available via API/i);
  });
});
