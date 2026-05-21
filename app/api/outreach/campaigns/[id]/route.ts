import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { parseCampaignDoc, updateCampaign } from "@/lib/outreach/campaign-service";
import { UpdateCampaignSchema } from "@/lib/outreach/schemas";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const snap = await db.collection(col.campaigns).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = snap.data()!;
  if (data.organizationId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recipientsSnap = await db
    .collection(col.outreachRecipients)
    .where("campaignId", "==", id)
    .limit(200)
    .get();

  const recipients = recipientsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  return NextResponse.json({
    campaign: parseCampaignDoc(id, data),
    recipientCount: recipientsSnap.size,
    recipients,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminFirestore();
  const campaign = await updateCampaign(db, session.orgId, id, parsed.data);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAuditLog({
    organizationId: session.orgId,
    actorId: session.user.uid,
    action: parsed.data.status === "active" ? "outreach.campaign.launch" : "outreach.campaign.update",
    resource: `${col.campaigns}/${id}`,
    payload: parsed.data,
  });

  return NextResponse.json(campaign);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getAdminFirestore();
  const ref = db.collection(col.campaigns).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.organizationId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ref.delete();
  await writeAuditLog({
    organizationId: session.orgId,
    actorId: session.user.uid,
    action: "outreach.campaign.delete",
    resource: `${col.campaigns}/${id}`,
  });

  return NextResponse.json({ ok: true });
}
