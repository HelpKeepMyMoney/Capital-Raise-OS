import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

export const onOrganizationMemberWrite = onDocumentWritten(
  "organization_members/{memberId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const data = after.data() as { userId?: string; organizationId?: string; role?: string };
    const uid = data.userId;
    const orgId = data.organizationId;
    const role = data.role;
    if (!uid || !orgId || !role) return;

    const user = await auth.getUser(uid);
    const orgs = { ...(user.customClaims?.orgs as Record<string, string> | undefined) };
    orgs[orgId] = role;
    await auth.setCustomUserClaims(uid, { ...user.customClaims, orgs });
  },
);

export const weeklyFundraisingDigest = onSchedule("every monday 09:00", async () => {
  const orgs = await db.collection("organizations").limit(25).get();
  for (const doc of orgs.docs) {
    await db.collection("tasks").add({
      organizationId: doc.id,
      title: "Weekly fundraising report",
      status: "open",
      dueAt: Date.now() + 3 * 86400000,
      createdAt: Date.now(),
    });
  }
});
