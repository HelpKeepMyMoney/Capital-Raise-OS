import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { OutreachCampaign, OutreachEvent, OutreachSequence } from "@/lib/firestore/types";
import { parseCampaignDoc } from "@/lib/outreach/campaign-service";
import { buildFunnel, loadOutreachTimeSeries } from "@/lib/outreach/analytics";
import { normalizeCampaignMetrics } from "@/lib/outreach/metrics-helpers";

function isIndexError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("FAILED_PRECONDITION") || msg.includes("requires an index");
}

export async function listOutreachCampaignsForOrg(orgId: string, limit = 50): Promise<OutreachCampaign[]> {
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(col.campaigns)
      .where("organizationId", "==", orgId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => parseCampaignDoc(d.id, d.data()));
  } catch (err) {
    if (!isIndexError(err)) throw err;
    const snap = await db.collection(col.campaigns).where("organizationId", "==", orgId).limit(limit).get();
    return snap.docs
      .map((d) => parseCampaignDoc(d.id, d.data()))
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
  }
}

export async function listOutreachSequencesForOrg(orgId: string, limit = 20): Promise<OutreachSequence[]> {
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(col.outreachSequences)
      .where("organizationId", "==", orgId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OutreachSequence);
  } catch (err) {
    if (!isIndexError(err)) throw err;
    const snap = await db
      .collection(col.outreachSequences)
      .where("organizationId", "==", orgId)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as OutreachSequence)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }
}

export async function listRecentOutreachEvents(orgId: string, limit = 40): Promise<OutreachEvent[]> {
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(col.outreachEvents)
      .where("organizationId", "==", orgId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OutreachEvent);
  } catch (err) {
    if (!isIndexError(err)) throw err;
    const snap = await db
      .collection(col.outreachEvents)
      .where("organizationId", "==", orgId)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as OutreachEvent)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function loadOutreachDashboardData(orgId: string) {
  const db = getAdminFirestore();
  const [campaigns, sequences, events] = await Promise.all([
    listOutreachCampaignsForOrg(orgId),
    listOutreachSequencesForOrg(orgId),
    listRecentOutreachEvents(orgId),
  ]);

  let metrics = normalizeCampaignMetrics({});
  for (const c of campaigns.filter((x) => x.status === "active")) {
    const m = c.metrics;
    metrics = {
      recipients: metrics.recipients + m.recipients,
      sent: metrics.sent + m.sent,
      opened: metrics.opened + m.opened,
      replied: metrics.replied + m.replied,
      clicked: metrics.clicked + m.clicked,
      meetingsBooked: metrics.meetingsBooked + m.meetingsBooked,
      dataRoomVisits: metrics.dataRoomVisits + m.dataRoomVisits,
      bounced: (metrics.bounced ?? 0) + (m.bounced ?? 0),
    };
  }

  const timeSeries = await loadOutreachTimeSeries(db, orgId, 30);

  return {
    campaigns,
    sequences,
    events,
    funnel: buildFunnel(metrics),
    timeSeries,
  };
}
