import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type {
  OutreachCampaignMetrics,
  OutreachEvent,
  OutreachEventType,
} from "@/lib/firestore/types";

export function computeEngagementScore(events: { eventType: OutreachEventType }[]): number {
  let score = 0;
  for (const e of events) {
    switch (e.eventType) {
      case "email_opened":
        score += 10;
        break;
      case "email_clicked":
        score += 25;
        break;
      case "email_replied":
        score += 50;
        break;
      case "meeting_booked":
        score += 40;
        break;
      case "data_room_viewed":
        score += 30;
        break;
      default:
        break;
    }
  }
  return Math.min(100, score);
}

export type OutreachFunnel = OutreachCampaignMetrics & {
  openRate: number;
  clickRate: number;
  replyRate: number;
};

export function buildFunnel(metrics: OutreachCampaignMetrics): OutreachFunnel {
  const sent = metrics.sent || 0;
  return {
    ...metrics,
    openRate: sent ? Math.round((metrics.opened / sent) * 100) : 0,
    clickRate: sent ? Math.round((metrics.clicked / sent) * 100) : 0,
    replyRate: sent ? Math.round((metrics.replied / sent) * 100) : 0,
  };
}

export type OutreachTimeSeriesPoint = {
  label: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
};

export async function loadOutreachTimeSeries(
  db: Firestore,
  orgId: string,
  days: number,
  campaignId?: string,
): Promise<OutreachTimeSeriesPoint[]> {
  const cutoff = Date.now() - days * 86400000;
  const snap = await db
    .collection(col.outreachEvents)
    .where("organizationId", "==", orgId)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();
  const dayKeys: string[] = [];
  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const buckets = new Map<string, OutreachTimeSeriesPoint>();
  for (const k of dayKeys) {
    buckets.set(k, { label: k, sent: 0, opened: 0, clicked: 0, replied: 0 });
  }

  for (const doc of snap.docs) {
    const e = doc.data() as OutreachEvent;
    if (campaignId && e.campaignId !== campaignId) continue;
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (e.eventType === "email_sent") b.sent += 1;
    if (e.eventType === "email_opened") b.opened += 1;
    if (e.eventType === "email_clicked") b.clicked += 1;
    if (e.eventType === "email_replied") b.replied += 1;
  }

  return dayKeys.map((k) => buckets.get(k)!);
}

export async function writeAnalyticsSnapshot(
  db: Firestore,
  orgId: string,
  campaignId: string | undefined,
  metrics: OutreachCampaignMetrics,
) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const id = campaignId ? `${orgId}_${campaignId}_${dateKey}` : `${orgId}_${dateKey}`;
  await db.collection(col.outreachAnalyticsSnapshots).doc(id).set({
    id,
    organizationId: orgId,
    campaignId: campaignId ?? null,
    dateKey,
    metrics,
    createdAt: Date.now(),
  });
}
