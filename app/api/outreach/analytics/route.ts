import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { parseCampaignDoc } from "@/lib/outreach/campaign-service";
import { buildFunnel, loadOutreachTimeSeries } from "@/lib/outreach/analytics";
import { normalizeCampaignMetrics } from "@/lib/outreach/metrics-helpers";
import type { OutreachCampaignMetrics } from "@/lib/firestore/types";
import { defaultCampaignMetrics } from "@/lib/outreach/schemas";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = req.nextUrl.searchParams.get("campaignId") ?? undefined;
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

  const db = getAdminFirestore();

  let metrics: OutreachCampaignMetrics = defaultCampaignMetrics();

  if (campaignId) {
    const snap = await db.collection(col.campaigns).doc(campaignId).get();
    if (snap.exists && snap.data()?.organizationId === ctx.orgId) {
      metrics = normalizeCampaignMetrics(parseCampaignDoc(campaignId, snap.data()!));
    }
  } else {
    const snap = await db
      .collection(col.campaigns)
      .where("organizationId", "==", ctx.orgId)
      .where("status", "==", "active")
      .limit(20)
      .get();
    for (const doc of snap.docs) {
      const m = normalizeCampaignMetrics(parseCampaignDoc(doc.id, doc.data()));
      metrics.recipients += m.recipients;
      metrics.sent += m.sent;
      metrics.opened += m.opened;
      metrics.replied += m.replied;
      metrics.clicked += m.clicked;
      metrics.meetingsBooked += m.meetingsBooked;
      metrics.dataRoomVisits += m.dataRoomVisits;
    }
  }

  const timeSeries = await loadOutreachTimeSeries(db, ctx.orgId, days, campaignId);

  const sequencesSnap = await db
    .collection(col.outreachSequences)
    .where("organizationId", "==", ctx.orgId)
    .orderBy("updatedAt", "desc")
    .limit(10)
    .get();

  return NextResponse.json({
    funnel: buildFunnel(metrics),
    timeSeries,
    topSequences: sequencesSnap.docs.map((d) => ({
      id: d.id,
      name: d.get("name"),
      stepCount: (d.get("steps") as unknown[])?.length ?? 0,
    })),
  });
}
