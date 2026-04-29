import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { DealPatchBodySchema, dealPatchToFirestoreUpdate } from "@/lib/deals/patch-deal";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: dealId } = await ctx.params;
  const deal = await getDeal(session.orgId, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DealPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates = dealPatchToFirestoreUpdate(parsed.data);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, id: dealId, noop: true });
  }

  const db = getAdminFirestore();
  await db.collection(col.deals).doc(dealId).update(updates);

  await writeAuditLog({
    organizationId: session.orgId,
    actorId: session.user.uid,
    action: "deal.update",
    resource: `${col.deals}/${dealId}`,
    payload: { keys: Object.keys(updates) },
  });

  return NextResponse.json({ ok: true, id: dealId });
}
