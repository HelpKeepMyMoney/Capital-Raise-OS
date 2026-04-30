import { NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listOrganizationMembers } from "@/lib/firestore/queries";

/** Team roster for assigning relationship owners from sponsor UIs (e.g. Data Room Investors). */
export async function GET() {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listOrganizationMembers(ctx.orgId);
  const teamOnly = members.filter((x) => !["investor_guest"].includes(x.role));
  return NextResponse.json({ members: teamOnly });
}
