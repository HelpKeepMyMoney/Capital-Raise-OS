import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import type {
  Activity,
  Deal,
  Investor,
  Meeting,
  Organization,
  Task,
} from "@/lib/firestore/types";
function mapDocs<T extends { id: string }>(
  snap: FirebaseFirestore.QuerySnapshot,
  map: (data: FirebaseFirestore.DocumentData, id: string) => T,
): T[] {
  return snap.docs.map((d) => map(d.data(), d.id));
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.organizations).doc(orgId).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Organization, "id">) };
}

export async function listUserOrganizations(
  uid: string,
): Promise<{ org: Organization; role: string }[]> {
  const db = getAdminFirestore();
  const q = await db
    .collection(col.organizationMembers)
    .where("userId", "==", uid)
    .get();
  const out: { org: Organization; role: string }[] = [];
  for (const doc of q.docs) {
    const m = doc.data() as { organizationId: string; role: string };
    const org = await getOrganization(m.organizationId);
    if (org) out.push({ org, role: m.role });
  }
  return out;
}

export async function getMembership(
  orgId: string,
  uid: string,
): Promise<{ role: string } | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.organizationMembers).doc(memberDocId(orgId, uid)).get();
  if (!d.exists) return null;
  const data = d.data() as { role: string };
  return { role: data.role };
}

export async function listInvestors(orgId: string, limit = 500): Promise<Investor[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.investors)
    .where("organizationId", "==", orgId)
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Investor, "id">) }));
}

export async function listTasksDueToday(orgId: string, start: number, end: number): Promise<Task[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.tasks)
    .where("organizationId", "==", orgId)
    .where("dueAt", ">=", start)
    .where("dueAt", "<=", end)
    .limit(80)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Task, "id">) })).filter(
    (t) => t.status === "open",
  );
}

export async function listRecentActivities(orgId: string, limit = 20): Promise<Activity[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.activities)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Activity, "id">) }));
}

export async function listUpcomingMeetings(orgId: string, from: number, limit = 20): Promise<Meeting[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.meetings)
    .where("organizationId", "==", orgId)
    .where("startsAt", ">=", from)
    .orderBy("startsAt", "asc")
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Meeting, "id">) }));
}

export async function listDeals(orgId: string): Promise<Deal[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.deals)
    .where("organizationId", "==", orgId)
    .limit(100)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Deal, "id">) }));
}

export function funnelCounts(investors: Investor[]) {
  const stages = [
    "lead",
    "researching",
    "contacted",
    "responded",
    "meeting_scheduled",
    "data_room_opened",
    "due_diligence",
    "soft_circled",
    "committed",
    "closed",
    "declined",
  ] as const;
  const counts: Record<string, number> = {};
  for (const s of stages) counts[s] = 0;
  for (const inv of investors) {
    counts[inv.pipelineStage] = (counts[inv.pipelineStage] ?? 0) + 1;
  }
  return stages.map((s) => ({ stage: s, count: counts[s] ?? 0 }));
}

function startOfIsoWeek(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay() || 7;
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  x.setUTCHours(0, 0, 0, 0);
  return x.getTime();
}

export async function weeklyOutreachStats(
  orgId: string,
): Promise<{ label: string; sent: number; replies: number }[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.emails)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(400)
    .get();
  const buckets = new Map<number, { sent: number; replies: number }>();
  let w = startOfIsoWeek(new Date());
  for (let i = 0; i < 8; i++) {
    buckets.set(w, { sent: 0, replies: 0 });
    w -= 7 * 24 * 60 * 60 * 1000;
  }
  for (const doc of snap.docs) {
    const e = doc.data() as { createdAt?: number; status?: string; replySentiment?: string };
    if (!e.createdAt) continue;
    const wk = startOfIsoWeek(new Date(e.createdAt));
    if (!buckets.has(wk)) continue;
    const cur = buckets.get(wk)!;
    if (e.status === "sent" || e.status === "delivered") cur.sent += 1;
    if (e.replySentiment && e.replySentiment !== "unknown") cur.replies += 1;
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, v]) => ({
      label: new Date(ts).toISOString().slice(0, 10),
      ...v,
    }));
}
