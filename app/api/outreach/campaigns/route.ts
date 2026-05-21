import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { createCampaign, parseCampaignDoc } from "@/lib/outreach/campaign-service";
import { CreateCampaignSchema } from "@/lib/outreach/schemas";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25));
  const startAfter = req.nextUrl.searchParams.get("startAfter");

  const db = getAdminFirestore();
  let q = db
    .collection(col.campaigns)
    .where("organizationId", "==", ctx.orgId)
    .orderBy("updatedAt", "desc")
    .limit(limit + 1);

  if (status) {
    q = db
      .collection(col.campaigns)
      .where("organizationId", "==", ctx.orgId)
      .where("status", "==", status)
      .orderBy("updatedAt", "desc")
      .limit(limit + 1);
  }

  if (startAfter) {
    const cursor = await db.collection(col.campaigns).doc(startAfter).get();
    if (cursor.exists) q = q.startAfter(cursor);
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limit);
  const nextCursor = snap.docs.length > limit ? docs[docs.length - 1]?.id : null;

  return NextResponse.json({
    campaigns: docs.map((d) => parseCampaignDoc(d.id, d.data())),
    nextCursor,
  });
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

  const parsed = CreateCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const campaign = await createCampaign(db, ctx.orgId, ctx.user.uid, parsed.data);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "outreach.campaign.create",
    resource: `${col.campaigns}/${campaign.id}`,
    payload: { name: campaign.name },
  });

  return NextResponse.json(campaign);
}
