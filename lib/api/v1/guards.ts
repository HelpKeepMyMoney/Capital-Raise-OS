import type { DealStatus } from "@/lib/firestore/types";
import { DealStatusSchema } from "@/lib/firestore/types";

/** Validate deal status for API writes. Any in-app status is allowed. */
export function parseDealStatusWrite(
  status: unknown,
): { ok: true; status?: DealStatus } | { ok: false; message: string } {
  if (status === undefined) return { ok: true };
  const parsed = DealStatusSchema.safeParse(status);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid deal status. Use draft, active, closing, closed, or cancelled.",
    };
  }
  return { ok: true, status: parsed.data };
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
