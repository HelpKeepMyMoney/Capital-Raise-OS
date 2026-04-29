import { NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { listInvestorInvitationsForOrganization } from "@/lib/data-room/server-queries";
import { getMembership } from "@/lib/firestore/queries";

export async function GET() {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await listInvestorInvitationsForOrganization(ctx.orgId, 100);

  return NextResponse.json({ invitations });
}
