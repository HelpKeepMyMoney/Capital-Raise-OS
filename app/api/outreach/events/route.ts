import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { OutreachEvent } from "@/lib/firestore/types";
import { RecordEventSchema } from "@/lib/outreach/schemas";
import { recordOutreachEvent } from "@/lib/outreach/events";
import { handleOutreachEventSideEffects } from "@/lib/outreach/engine";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const investorId = req.nextUrl.searchParams.get("investorId");
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 40));

  const db = getAdminFirestore();
  let q = db
    .collection(col.outreachEvents)
    .where("organizationId", "==", ctx.orgId)
    .orderBy("createdAt", "desc")
    .limit(limit);

  const snap = await q.get();
  let events = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OutreachEvent);
  if (campaignId) events = events.filter((e) => e.campaignId === campaignId);
  if (investorId) events = events.filter((e) => e.investorId === investorId);

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RecordEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const id = await recordOutreachEvent(db, {
    organizationId: ctx.orgId,
    ...parsed.data,
  });

  const campaignSnap = await db.collection(col.campaigns).doc(parsed.data.campaignId).get();
  const relatedDealId = campaignSnap.data()?.relatedDealId as string | undefined;

  await handleOutreachEventSideEffects(db, {
    organizationId: ctx.orgId,
    campaignId: parsed.data.campaignId,
    recipientId: parsed.data.recipientId,
    investorId: parsed.data.investorId,
    eventType: parsed.data.eventType,
    relatedDealId,
    metadata: parsed.data.metadata,
  });

  return NextResponse.json({ id });
}
