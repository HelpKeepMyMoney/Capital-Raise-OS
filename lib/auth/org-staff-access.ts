import { getAdminAuth } from "@/lib/firebase/admin";
import { canEditOrgData } from "@/lib/auth/rbac";
import { getMembership } from "@/lib/firestore/queries";

/**
 * Sponsor-side signing and CRM actions: true if Firestore membership grants staff access,
 * or if Firebase Auth custom claims still list a non-guest role (handles membership sync lag).
 */
export async function userHasStaffAccessToOrg(uid: string, organizationId: string): Promise<boolean> {
  const mem = await getMembership(organizationId, uid);
  if (mem && canEditOrgData(mem.role)) return true;
  try {
    const u = await getAdminAuth().getUser(uid);
    const orgs = u.customClaims?.orgs as Record<string, string> | undefined;
    const r = orgs?.[organizationId];
    return Boolean(r && canEditOrgData(r));
  } catch {
    return false;
  }
}
