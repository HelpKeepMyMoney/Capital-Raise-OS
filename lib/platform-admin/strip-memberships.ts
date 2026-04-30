import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

const BATCH_DELETE = 400;

/** Deletes all organization_members docs for uid. Returns org IDs that had a membership removed. */
export async function deleteAllMembershipsForUser(uid: string): Promise<{ orgIdsAffected: string[] }> {
  const db = getAdminFirestore();
  const snap = await db.collection(col.organizationMembers).where("userId", "==", uid).get();
  const orgIdsAffected: string[] = [];

  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    const oid = (doc.data() as { organizationId?: string }).organizationId;
    if (oid) orgIdsAffected.push(oid);
    batch.delete(doc.ref);
    n++;
    if (n >= BATCH_DELETE) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();

  return { orgIdsAffected };
}
