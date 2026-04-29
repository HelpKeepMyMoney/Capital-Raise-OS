import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

export type DataRoomMetricsDTO = {
  activeRooms: number;
  totalDocuments: number;
  investorViewsThisWeek: number;
  /** Week-over-week percent change for signed URL / open events; null if prior week was 0 or unavailable. */
  investorViewsTrendPct: number | null;
  ndasPending: number;
  mostViewedRoom: { id: string; name: string; views: number } | null;
  invitedInvestorsCount: number;
};

const MS_DAY = 86400000;

function startOfWeekUtc(now: number): number {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday start
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Aggregates org-level data room KPIs (Admin SDK — not for client Firestore reads).
 */
export async function computeDataRoomMetrics(orgId: string): Promise<DataRoomMetricsDTO> {
  const db = getAdminFirestore();
  const now = Date.now();
  const weekStart = startOfWeekUtc(now);
  const prevWeekStart = weekStart - 7 * MS_DAY;
  const twoWeeksAgo = prevWeekStart;

  const [roomsSnap, docsSnap, invitationsSnap, auditSnap] = await Promise.all([
    db.collection(col.dataRooms).where("organizationId", "==", orgId).limit(200).get(),
    db.collection(col.documents).where("organizationId", "==", orgId).limit(500).get(),
    db.collection(col.investorInvitations).where("organizationId", "==", orgId).limit(300).get(),
    db
      .collection(col.auditLogs)
      .where("organizationId", "==", orgId)
      .where("createdAt", ">=", twoWeeksAgo)
      .orderBy("createdAt", "desc")
      .limit(400)
      .get(),
  ]);

  let activeRooms = 0;
  const roomNameById = new Map<string, string>();
  for (const d of roomsSnap.docs) {
    const x = d.data() as { name?: string; archived?: boolean };
    if (x.archived) continue;
    activeRooms += 1;
    roomNameById.set(d.id, typeof x.name === "string" ? x.name : d.id);
  }

  const totalDocuments = docsSnap.size;

  let thisWeekViews = 0;
  let prevWeekViews = 0;
  for (const d of auditSnap.docs) {
    const row = d.data() as { action?: string; createdAt?: number };
    if (row.action !== "data_room.signed_url") continue;
    const t = row.createdAt ?? 0;
    if (t >= weekStart) thisWeekViews += 1;
    else if (t >= prevWeekStart && t < weekStart) prevWeekViews += 1;
  }

  let investorViewsTrendPct: number | null = null;
  if (prevWeekViews > 0) {
    investorViewsTrendPct = Math.round(((thisWeekViews - prevWeekViews) / prevWeekViews) * 100);
  } else if (thisWeekViews > 0 && prevWeekViews === 0) {
    investorViewsTrendPct = 100;
  }

  const viewsByRoom = new Map<string, number>();
  for (const d of docsSnap.docs) {
    const x = d.data() as { dataRoomId?: string; viewCount?: number };
    const rid = x.dataRoomId;
    if (!rid) continue;
    const vc = typeof x.viewCount === "number" ? x.viewCount : 0;
    viewsByRoom.set(rid, (viewsByRoom.get(rid) ?? 0) + vc);
  }
  let mostViewedRoom: { id: string; name: string; views: number } | null = null;
  for (const [id, views] of viewsByRoom) {
    if (views <= 0) continue;
    if (!mostViewedRoom || views > mostViewedRoom.views) {
      mostViewedRoom = {
        id,
        name: roomNameById.get(id) ?? id,
        views,
      };
    }
  }

  let invitedInvestorsCount = 0;
  for (const d of invitationsSnap.docs) {
    const inv = d.data() as { expiresAt?: number; revokedAt?: number };
    if (inv.revokedAt) continue;
    if (typeof inv.expiresAt === "number" && inv.expiresAt < now) continue;
    invitedInvestorsCount += 1;
  }

  // Placeholder until per-investor NDA state exists in Firestore.
  const ndasPending = 0;

  return {
    activeRooms,
    totalDocuments,
    investorViewsThisWeek: thisWeekViews,
    investorViewsTrendPct,
    ndasPending,
    mostViewedRoom,
    invitedInvestorsCount,
  };
}
