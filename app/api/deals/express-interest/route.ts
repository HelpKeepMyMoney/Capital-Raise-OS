import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dealId } = (await req.json()) as { dealId?: string };
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const [deal, membership] = await Promise.all([
    getDeal(ctx.orgId, dealId),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!memberCanAccessDeal(membership, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminFirestore();
  const id = randomUUID();
  const now = Date.now();

  await db.collection(col.activities).doc(id).set({
    id,
    organizationId: ctx.orgId,
    type: "deal_interest",
    summary: `Expressed interest in ${deal.name}`,
    actorId: ctx.user.uid,
    metadata: { dealId: deal.id, dealName: deal.name },
    createdAt: now,
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "deal.express_interest",
    resource: `${col.deals}/${dealId}`,
  });

  return NextResponse.json({ ok: true });
}
