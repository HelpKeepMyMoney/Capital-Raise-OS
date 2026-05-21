import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getMembership } from "@/lib/firestore/queries";
import { processOutreachQueueForCampaign } from "@/lib/outreach/engine";

export async function POST(
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
  const result = await processOutreachQueueForCampaign(db, session.orgId, id);

  console.log("[outreach-process]", {
    campaignId: id,
    orgId: session.orgId,
    ...result,
    finishedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    campaignId: id,
    ...result,
  });
}
