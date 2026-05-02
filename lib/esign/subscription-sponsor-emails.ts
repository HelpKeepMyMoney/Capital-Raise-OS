import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { canEditOrgData } from "@/lib/auth/rbac";
import { col } from "@/lib/firestore/paths";
import type { Organization } from "@/lib/firestore/types";

/** Prefer leadership; fall back to any non-guest member so someone receives subscription alerts. */
const PRIMARY_NOTIFY_ROLES = new Set([
  "founder",
  "admin",
  "sponsor",
  "fund_manager",
]);

/**
 * Resolves who should receive “subscription packet — sponsor signs first” emails.
 * Uses org contact email when set; otherwise Firebase Auth emails for org members.
 */
export async function resolveDealSubscriptionSponsorEmails(org: Organization): Promise<string[]> {
  const contact = org.contact?.contactPerson?.email?.trim().toLowerCase();
  if (contact && contact.includes("@")) return [contact];

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const snap = await db.collection(col.organizationMembers).where("organizationId", "==", org.id).get();

  const primary = new Set<string>();
  const fallback = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data() as { userId?: string; role?: string };
    const userId = typeof data.userId === "string" ? data.userId : "";
    const role = typeof data.role === "string" ? data.role : "";
    if (!userId) continue;

    let email: string | undefined;
    try {
      const u = await auth.getUser(userId);
      email = u.email?.trim().toLowerCase();
    } catch {
      continue;
    }
    if (!email) continue;

    if (PRIMARY_NOTIFY_ROLES.has(role)) primary.add(email);
    else if (canEditOrgData(role)) fallback.add(email);
  }

  if (primary.size > 0) return [...primary];
  if (fallback.size > 0) return [...fallback];
  return [];
}
