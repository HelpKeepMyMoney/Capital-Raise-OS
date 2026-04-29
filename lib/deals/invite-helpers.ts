import type { InvestorInvitation } from "@/lib/firestore/types";

/** Non-component helper so `Date.now()` is not invoked during React render. */
export function countActiveInvitesForDeal(invites: InvestorInvitation[], dealId: string): number {
  const now = Date.now();
  return invites.filter(
    (i) =>
      !i.revokedAt &&
      (!i.expiresAt || i.expiresAt > now) &&
      i.scope === "deal" &&
      i.dealIds.includes(dealId),
  ).length;
}
