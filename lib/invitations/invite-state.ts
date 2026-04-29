import type { InvestorInvitation } from "@/lib/firestore/types";

export function isInvitationConsumable(inv: InvestorInvitation, nowMs = Date.now()): boolean {
  if (inv.revokedAt) return false;
  if (inv.expiresAt <= nowMs) return false;
  return true;
}

export function invitationEmailMatches(inv: InvestorInvitation, authEmail: string | undefined): boolean {
  if (!inv.email?.trim()) return true;
  const normalized = inv.email.trim().toLowerCase();
  const em = authEmail?.trim().toLowerCase() ?? "";
  return em.length > 0 && em === normalized;
}
