import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

/**
 * Rebuilds `customClaims.orgs` from Firestore `organization_members` for this user.
 * Preserves other custom claims.
 */
export async function syncUserOrgClaimsFromFirestore(uid: string): Promise<void> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const userRecord = await auth.getUser(uid);
  const prev = userRecord.customClaims ?? {};
  const orgsSnap = await db.collection(col.organizationMembers).where("userId", "==", uid).get();
  const orgs: Record<string, string> = {};
  for (const d of orgsSnap.docs) {
    const x = d.data() as { organizationId?: string; role?: string };
    if (x.organizationId && x.role) orgs[x.organizationId] = x.role;
  }
  await auth.setCustomUserClaims(uid, { ...prev, orgs });
}

/**
 * If `users.defaultOrganizationId` is set but the user has no membership for that org,
 * clear it or set to another remaining org.
 */
export async function reconcileUserDefaultOrganizationId(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const orgsSnap = await db.collection(col.organizationMembers).where("userId", "==", uid).get();
  const orgIds = new Set<string>();
  for (const d of orgsSnap.docs) {
    const oid = (d.data() as { organizationId?: string }).organizationId;
    if (oid) orgIds.add(oid);
  }

  const userRef = db.collection(col.users).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;
  const def = userSnap.data()?.defaultOrganizationId as string | undefined;
  if (!def) return;
  if (orgIds.has(def)) return;

  const first = orgIds.values().next().value as string | undefined;
  if (first) {
    await userRef.update({ defaultOrganizationId: first });
  } else {
    await userRef.update({ defaultOrganizationId: FieldValue.delete() });
  }
}

export async function syncUserOrgClaimsAndDefaultOrg(uid: string): Promise<void> {
  await syncUserOrgClaimsFromFirestore(uid);
  await reconcileUserDefaultOrganizationId(uid);
}
