import { col } from "@/lib/firestore/paths";
import type { Firestore } from "firebase-admin/firestore";
import type { InvestorInvitation } from "@/lib/firestore/types";

/** CRM row tied to this invitation (explicit link first, otherwise unique investor email match). */
export async function resolveInvestorIdForInvitation(
  db: Firestore,
  organizationId: string,
  invitation: InvestorInvitation,
): Promise<string | null> {
  if (typeof invitation.linkedInvestorId === "string" && invitation.linkedInvestorId.trim()) {
    return invitation.linkedInvestorId.trim();
  }
  const email = typeof invitation.email === "string" ? invitation.email.trim().toLowerCase() : "";
  if (!email) return null;
  const qs = await db
    .collection(col.investors)
    .where("organizationId", "==", organizationId)
    .where("email", "==", email)
    .limit(3)
    .get();
  if (qs.size !== 1) return null;
  return qs.docs[0]!.id;
}
