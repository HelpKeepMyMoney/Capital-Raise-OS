import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId, dealCommitmentDocId, signingRequestDocId } from "@/lib/firestore/paths";
import type {
  Activity,
  DataRoom,
  Deal,
  DealCommitment,
  Investor,
  InvestorInvitation,
  InvestorAccess,
  Meeting,
  Organization,
  PipelineStage,
  RoomDocument,
  SigningRequest,
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
): Promise<{ role: string; investorAccess?: InvestorAccess } | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.organizationMembers).doc(memberDocId(orgId, uid)).get();
  if (!d.exists) return null;
  const data = d.data() as { role: string; investorAccess?: InvestorAccess };
  return { role: data.role, investorAccess: data.investorAccess };
}

export function isInvestorActive(inv: Investor): boolean {
  return inv.crmStatus !== "archived";
}

export async function getInvestor(orgId: string, investorId: string): Promise<Investor | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.investors).doc(investorId).get();
  if (!d.exists) return null;
  const data = d.data() as Omit<Investor, "id">;
  if (data.organizationId !== orgId) return null;
  return { id: d.id, ...data };
}

export async function listInvestors(
  orgId: string,
  opts?: { limit?: number; includeArchived?: boolean },
): Promise<Investor[]> {
  const limit = opts?.limit ?? 500;
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.investors)
    .where("organizationId", "==", orgId)
    .limit(limit)
    .get();
  let list = mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Investor, "id">) }));
  if (!opts?.includeArchived) {
    list = list.filter(isInvestorActive);
  }
  return list;
}

export async function listActivitiesForInvestor(
  orgId: string,
  investorId: string,
  limit = 50,
): Promise<Activity[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.activities)
    .where("organizationId", "==", orgId)
    .where("investorId", "==", investorId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Activity, "id">) }));
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

export async function listOpenTasks(orgId: string, limit = 80): Promise<Task[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.tasks)
    .where("organizationId", "==", orgId)
    .where("status", "==", "open")
    .limit(limit)
    .get();
  const list = mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Task, "id">) }));
  list.sort((a, b) => {
    const ad = a.dueAt ?? a.createdAt;
    const bd = b.dueAt ?? b.createdAt;
    return ad - bd;
  });
  return list;
}

/** Done and cancelled tasks, newest first. */
export async function listClosedTasks(orgId: string, limit = 80): Promise<Task[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.tasks)
    .where("organizationId", "==", orgId)
    .where("status", "in", ["done", "cancelled"])
    .limit(limit)
    .get();
  const list = mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Task, "id">) }));
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
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

/** `from` defaults to request-time epoch ms (call from server handlers / queries; avoids Date.now in React renders). */
export async function listUpcomingMeetings(orgId: string, from?: number, limit = 20): Promise<Meeting[]> {
  const db = getAdminFirestore();
  const fromTs = typeof from === "number" ? from : Date.now();
  const snap = await db
    .collection(col.meetings)
    .where("organizationId", "==", orgId)
    .where("startsAt", ">=", fromTs)
    .orderBy("startsAt", "asc")
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<Meeting, "id">) }));
}

export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvestorInvitation | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.investorInvitations)
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<InvestorInvitation, "id">) };
}

export async function listInvestorInvitationsForOrganization(
  orgId: string,
  limit = 40,
): Promise<InvestorInvitation[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.investorInvitations)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<InvestorInvitation, "id">),
  }));
}

export async function getDealCommitmentForUser(
  orgId: string,
  dealId: string,
  userId: string,
): Promise<DealCommitment | null> {
  const db = getAdminFirestore();
  const id = dealCommitmentDocId(orgId, dealId, userId);
  const d = await db.collection(col.dealCommitments).doc(id).get();
  if (!d.exists) return null;
  const data = d.data() as Omit<DealCommitment, "id">;
  if (data.organizationId !== orgId) return null;
  return { id: d.id, ...data };
}

export async function listDealCommitmentsForDeal(
  orgId: string,
  dealId: string,
  limit = 100,
): Promise<DealCommitment[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dealCommitments)
    .where("organizationId", "==", orgId)
    .where("dealId", "==", dealId)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<DealCommitment, "id">),
  }));
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

export async function listDataRoomsForOrganization(orgId: string, limit = 80): Promise<DataRoom[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dataRooms)
    .where("organizationId", "==", orgId)
    .limit(limit)
    .get();
  return mapDocs(snap, (data, id) => ({ id, ...(data as Omit<DataRoom, "id">) }));
}

export async function getDeal(orgId: string, dealId: string): Promise<Deal | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.deals).doc(dealId).get();
  if (!d.exists) return null;
  const data = d.data() as Omit<Deal, "id">;
  if (data.organizationId !== orgId) return null;
  return { id: d.id, ...data };
}

export function funnelCounts(investors: Investor[], activeOnly = true) {
  const list = activeOnly ? investors.filter(isInvestorActive) : investors;
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
  for (const inv of list) {
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

export type DashboardEngagementDay = {
  label: string;
  sent: number;
  replies: number;
  /** Meetings created (booked) that day */
  meetingsBooked: number;
};

/** Last `days` calendar days (UTC) of outreach + meeting booking counts — caps Firestore reads. */
export async function dashboardEngagementDailySeries(
  orgId: string,
  days = 90,
): Promise<DashboardEngagementDay[]> {
  const cutoff = Date.now() - days * 86400000;
  const db = getAdminFirestore();

  const dayKeys: string[] = [];
  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const buckets = new Map<string, { sent: number; replies: number; meetingsBooked: number }>();
  for (const k of dayKeys) {
    buckets.set(k, { sent: 0, replies: 0, meetingsBooked: 0 });
  }

  const emailSnap = await db
    .collection(col.emails)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(1200)
    .get();

  for (const doc of emailSnap.docs) {
    const e = doc.data() as {
      createdAt?: number;
      status?: string;
      replySentiment?: string;
    };
    if (!e.createdAt || e.createdAt < cutoff) continue;
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    const cur = buckets.get(day);
    if (!cur) continue;
    if (e.status === "sent" || e.status === "delivered") cur.sent += 1;
    if (e.replySentiment && e.replySentiment !== "unknown") cur.replies += 1;
  }

  const meetSnap = await db
    .collection(col.meetings)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(400)
    .get();

  for (const doc of meetSnap.docs) {
    const m = doc.data() as { createdAt?: number; status?: string };
    if (!m.createdAt || m.createdAt < cutoff) continue;
    if (m.status && m.status !== "scheduled") continue;
    const day = new Date(m.createdAt).toISOString().slice(0, 10);
    const cur = buckets.get(day);
    if (!cur) continue;
    cur.meetingsBooked += 1;
  }

  return dayKeys.map((label) => {
    const v = buckets.get(label)!;
    return { label, ...v };
  });
}

const WEIGHTED_PIPELINE_STAGES: PipelineStage[] = [
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
  "soft_circled",
];

/** Midpoint check × relationshipScore/100 for mid-funnel stages. */
export function weightedPipelineValueUsd(investors: Investor[]): number {
  const list = investors.filter(isInvestorActive);
  let sum = 0;
  for (const inv of list) {
    if (!WEIGHTED_PIPELINE_STAGES.includes(inv.pipelineStage)) continue;
    const mid =
      inv.checkSizeMin != null && inv.checkSizeMax != null
        ? (inv.checkSizeMin + inv.checkSizeMax) / 2
        : (inv.checkSizeMax ?? inv.checkSizeMin ?? 0);
    if (mid <= 0) continue;
    const score = (inv.relationshipScore ?? 50) / 100;
    sum += mid * Math.min(1, Math.max(0, score));
  }
  return Math.round(sum);
}

/** Uses updatedAt − createdAt for closed rows (`closedAt` preferred in a later migration). */
export function averageDaysToClose(investors: Investor[]): number | null {
  const closed = investors.filter((i) => i.pipelineStage === "closed" && isInvestorActive(i));
  if (closed.length === 0) return null;
  const msDay = 86400000;
  const total = closed.reduce((s, i) => s + Math.max(0, (i.updatedAt - i.createdAt) / msDay), 0);
  return Math.round((total / closed.length) * 10) / 10;
}

export function openTasksDueBefore(tasks: Task[], endMsExclusive: number): Task[] {
  return tasks.filter(
    (t) => t.status === "open" && t.dueAt != null && t.dueAt < endMsExclusive,
  );
}

export async function listDealCommitmentsForOrganization(
  orgId: string,
  limit = 300,
): Promise<DealCommitment[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dealCommitments)
    .where("organizationId", "==", orgId)
    .limit(limit)
    .get();
  const list = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<DealCommitment, "id">),
  }));
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

export type OrganizationMemberPublic = {
  userId: string;
  role: string;
  email?: string;
  displayName?: string;
};

export async function listOrganizationMembers(orgId: string): Promise<OrganizationMemberPublic[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.organizationMembers)
    .where("organizationId", "==", orgId)
    .limit(100)
    .get();
  const auth = getAdminAuth();
  const out: OrganizationMemberPublic[] = [];
  for (const d of snap.docs) {
    const data = d.data() as { userId?: string; role?: string };
    const userId = data.userId ?? "";
    if (!userId) continue;
    let email: string | undefined;
    let displayName: string | undefined;
    try {
      const u = await auth.getUser(userId);
      email = u.email ?? undefined;
      displayName = u.displayName ?? undefined;
    } catch {
      /* stale member */
    }
    out.push({
      userId,
      role: data.role ?? "assistant",
      email,
      displayName,
    });
  }
  out.sort((a, b) =>
    (a.displayName ?? a.email ?? a.userId).localeCompare(b.displayName ?? b.email ?? b.userId),
  );
  return out;
}

/** Latest SignWell signing request for this LP + deal. */
export async function getSigningRequest(
  orgId: string,
  dealId: string,
  userId: string,
): Promise<SigningRequest | null> {
  const db = getAdminFirestore();
  const d = await db.collection(col.signingRequests).doc(signingRequestDocId(orgId, dealId, userId)).get();
  if (!d.exists) return null;
  const data = d.data() as Omit<SigningRequest, "id">;
  return { id: d.id, ...data };
}

/** Sum of active commitment amounts for a deal (whole currency units). */
export async function sumActiveCommitmentsForDeal(orgId: string, dealId: string): Promise<number> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dealCommitments)
    .where("organizationId", "==", orgId)
    .where("dealId", "==", dealId)
    .limit(200)
    .get();
  let sum = 0;
  for (const d of snap.docs) {
    const x = d.data() as { amount?: number; status?: string };
    if (x.status === "active" && typeof x.amount === "number") sum += x.amount;
  }
  return sum;
}

/** Non-archived data rooms linked to this deal (any match = show Data Room CTA). */
export async function hasActiveDataRoomForDeal(orgId: string, dealId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dataRooms)
    .where("organizationId", "==", orgId)
    .where("dealId", "==", dealId)
    .limit(12)
    .get();
  for (const d of snap.docs) {
    const x = d.data() as { archived?: boolean };
    if (!x.archived) return true;
  }
  return false;
}

/** Linked non-archived rooms for a deal. */
export async function listActiveDataRoomsForDeal(orgId: string, dealId: string): Promise<DataRoom[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dataRooms)
    .where("organizationId", "==", orgId)
    .where("dealId", "==", dealId)
    .limit(40)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<DataRoom, "id">) }))
    .filter((r) => !r.archived);
}

/** Documents in data rooms tied to this deal. */
export async function listDocumentsForDeal(orgId: string, dealId: string): Promise<RoomDocument[]> {
  const rooms = await listActiveDataRoomsForDeal(orgId, dealId);
  if (rooms.length === 0) return [];
  const roomIds = new Set(rooms.map((r) => r.id));
  const db = getAdminFirestore();
  const snap = await db.collection(col.documents).where("organizationId", "==", orgId).limit(500).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<RoomDocument, "id">) }))
    .filter((doc) => doc.dataRoomId && roomIds.has(doc.dataRoomId));
}

const TELEMETRY_ACTION = "deal.telemetry";

/** Recent deal telemetry events from audit log (filtered in memory; uses org + createdAt index). */
export async function listDealTelemetryEvents(
  orgId: string,
  dealId: string,
  maxScan = 800,
): Promise<{ event: string; createdAt: number; actorId?: string }[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.auditLogs)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(maxScan)
    .get();
  const out: { event: string; createdAt: number; actorId?: string }[] = [];
  for (const d of snap.docs) {
    const row = d.data() as {
      action?: string;
      createdAt?: number;
      actorId?: string;
      payload?: { dealId?: string; event?: string };
    };
    if (row.action !== TELEMETRY_ACTION) continue;
    if (row.payload?.dealId !== dealId) continue;
    const ev = row.payload?.event;
    if (typeof ev !== "string" || !ev) continue;
    out.push({ event: ev, createdAt: row.createdAt ?? 0, actorId: row.actorId });
    if (out.length >= 400) break;
  }
  return out;
}

/** Investors who have this dealId in interestedDealIds (active CRM rows). */
export function countInvestorsInterestedInDeal(investors: Investor[], dealId: string): number {
  let n = 0;
  for (const inv of investors) {
    if (!isInvestorActive(inv)) continue;
    const ids = inv.interestedDealIds ?? [];
    if (ids.includes(dealId)) n += 1;
  }
  return n;
}

export async function listDealCommitmentsForUser(
  orgId: string,
  userId: string,
  limit = 80,
): Promise<DealCommitment[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.dealCommitments)
    .where("organizationId", "==", orgId)
    .where("userId", "==", userId)
    .limit(limit)
    .get();
  const list = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<DealCommitment, "id">),
  }));
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

export async function listCampaignsForOrg(
  orgId: string,
  lim = 20,
): Promise<
  {
    id: string;
    name: string;
    stats?: { sent: number; opened: number; clicked: number; replied: number; bounced: number };
  }[]
> {
  const db = getAdminFirestore();
  const snap = await db.collection(col.campaigns).where("organizationId", "==", orgId).limit(lim).get();
  return snap.docs.map((d) => {
    const x = d.data() as {
      name?: string;
      stats?: { sent: number; opened: number; clicked: number; replied: number; bounced: number };
    };
    return { id: d.id, name: x.name ?? d.id, stats: x.stats };
  });
}

export async function listEmailsForOrg(
  orgId: string,
  lim = 200,
): Promise<{ status: string; replySentiment?: string; createdAt: number }[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(col.emails).where("organizationId", "==", orgId).limit(lim).get();
  const list = snap.docs.map((d) => {
    const x = d.data() as { status?: string; replySentiment?: string; createdAt?: number };
    return {
      status: x.status ?? "unknown",
      replySentiment: x.replySentiment,
      createdAt: x.createdAt ?? 0,
    };
  });
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}
