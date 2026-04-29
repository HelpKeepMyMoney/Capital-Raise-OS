import { FieldValue } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminBucket } from "@/lib/firebase/admin";
import { col, taskCommentsSubcollection } from "@/lib/firestore/paths";

const BATCH = 400;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function deleteWhereOrganizationId(
  db: Firestore,
  collectionName: string,
  orgId: string,
): Promise<number> {
  const cref = db.collection(collectionName);
  let total = 0;
  for (;;) {
    const snap = await cref.where("organizationId", "==", orgId).limit(BATCH).get();
    if (snap.empty) break;
    const bt = db.batch();
    for (const doc of snap.docs) bt.delete(doc.ref);
    await bt.commit();
    total += snap.docs.length;
  }
  return total;
}

/** Deletes tasks for org and nested task comment docs. */
async function deleteTasksWithComments(db: Firestore, orgId: string): Promise<void> {
  const cref = db.collection(col.tasks);
  for (;;) {
    const snap = await cref.where("organizationId", "==", orgId).limit(40).get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const commentsSnap = await doc.ref.collection(taskCommentsSubcollection).get();
      for (const part of chunk(commentsSnap.docs, BATCH)) {
        const bt = db.batch();
        for (const c of part) bt.delete(c.ref);
        await bt.commit();
      }
      await doc.ref.delete();
    }
  }
}

/**
 * Removes org from Firebase Auth custom claims and fixes users.{defaultOrganizationId}.
 * Call after Firestore org + membership docs are deleted.
 */
export async function removeOrganizationFromMembers(
  auth: Auth,
  db: Firestore,
  orgId: string,
  memberUids: string[],
): Promise<void> {
  const usersCol = db.collection(col.users);
  for (const uid of memberUids) {
    try {
      const ur = await auth.getUser(uid);
      const prev = (ur.customClaims ?? {}) as Record<string, unknown>;
      const orgs = { ...(prev.orgs as Record<string, string> | undefined) };
      delete orgs[orgId];
      await auth.setCustomUserClaims(uid, { ...prev, orgs });

      const userSnap = await usersCol.doc(uid).get();
      const def = userSnap.data()?.defaultOrganizationId;
      if (def === orgId) {
        const remaining = Object.keys(orgs);
        const nextOrg = remaining[0];
        if (nextOrg) {
          await usersCol.doc(uid).update({ defaultOrganizationId: nextOrg });
        } else {
          await usersCol.doc(uid).update({ defaultOrganizationId: FieldValue.delete() });
        }
      }
    } catch (e) {
      console.error("[removeOrganizationFromMembers]", uid, e);
    }
  }
}

export async function deleteOrgStoragePrefix(orgId: string): Promise<void> {
  try {
    const bucket = getAdminBucket();
    await bucket.deleteFiles({ prefix: `orgs/${orgId}/` });
  } catch (e) {
    console.error("[deleteOrgStoragePrefix]", orgId, e);
  }
}

/**
 * Deletes org-owned Firestore data (excluding `investors`), then org doc and members.
 * Does not update Auth claims — call `removeOrganizationFromMembers` after.
 */
export async function deleteOrganizationFirestore(db: Firestore, orgId: string): Promise<{ memberUids: string[] }> {
  const membersSnap = await db
    .collection(col.organizationMembers)
    .where("organizationId", "==", orgId)
    .get();
  const memberUids = membersSnap.docs.map((d) => (d.data() as { userId: string }).userId);

  await deleteTasksWithComments(db, orgId);

  const flatCollections: string[] = [
    col.signingRequests,
    col.dealCommitments,
    col.deals,
    col.activities,
    col.meetings,
    col.campaigns,
    col.emailTemplates,
    col.emails,
    col.documents,
    col.dataRooms,
    col.investorInvitations,
  ];

  for (const name of flatCollections) {
    await deleteWhereOrganizationId(db, name, orgId);
  }

  const subRef = db.collection(col.subscriptions).doc(orgId);
  const subSnap = await subRef.get();
  if (subSnap.exists) await subRef.delete();

  await deleteWhereOrganizationId(db, col.organizationMembers, orgId);

  await db.collection(col.organizations).doc(orgId).delete();

  return { memberUids };
}
