import type { DealStatus } from "@/lib/firestore/types";

const FORBIDDEN_STATUS: DealStatus[] = ["active", "closing", "closed"];

/** Reject publish / go-live via API (draft-only writes). */
export function rejectDealStatusWrite(status: unknown): { ok: true } | { ok: false; message: string } {
  if (status === undefined) return { ok: true };
  if (typeof status !== "string") {
    return { ok: false, message: "Publishing deals via API is not allowed. Omit status or use draft." };
  }
  const s = status as DealStatus;
  if (FORBIDDEN_STATUS.includes(s)) {
    return {
      ok: false,
      message:
        "Publishing deals via API is not allowed. Create and update deals as draft only; publish in the CapitalOS UI.",
    };
  }
  if (s !== "draft" && s !== "cancelled") {
    return { ok: false, message: "Only draft status is allowed when creating or updating deals via API." };
  }
  return { ok: true };
}

/** Block invite / email / outreach actions if present in body. */
export function rejectForbiddenApiActions(body: Record<string, unknown>): { ok: true } | { ok: false; message: string } {
  const blocked = [
    "publish",
    "sendInvite",
    "sendInvitation",
    "invite",
    "inviteInvestor",
    "sendEmail",
    "outreach",
    "campaignId",
    "sequenceId",
  ];
  for (const key of blocked) {
    if (key in body && body[key] != null) {
      return {
        ok: false,
        message: `Action "${key}" is not available via API. Invites, outreach, and email sends must use the CapitalOS UI.`,
      };
    }
  }
  return { ok: true };
}
