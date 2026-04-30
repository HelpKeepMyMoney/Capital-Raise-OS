import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { syncUserOrgClaimsFromFirestore } from "@/lib/auth/sync-org-claims";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import type { InvestorAccess } from "@/lib/firestore/types";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { validateInvestorGuestAccess } from "@/lib/platform-admin/investor-access-validation";
import { PlatformAdminMembershipPostSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid: targetUid } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminMembershipPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { organizationId, role, investorAccess } = parsed.data;

  const org = await getOrganization(organizationId);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const existing = await getMembership(organizationId, targetUid);
  if (existing) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
  }

  const accessResolved = investorAccess as InvestorAccess | undefined;
  if (role === "investor_guest") {
    const msg = await validateInvestorGuestAccess(organizationId, accessResolved!);
    if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  }

  const db = getAdminFirestore();
  const now = Date.now();
  const memberPayload: Record<string, unknown> = {
    organizationId,
    userId: targetUid,
    role,
    joinedAt: now,
  };
  if (role === "investor_guest" && accessResolved) memberPayload.investorAccess = accessResolved;

  await db
    .collection(col.organizationMembers)
    .doc(memberDocId(organizationId, targetUid))
    .set(memberPayload);

  await syncUserOrgClaimsFromFirestore(targetUid);

  await writeAuditLog({
    organizationId,
    actorId: gate.user.uid,
    action: "platform_admin.member_add",
    resource: `${col.organizationMembers}/${memberDocId(organizationId, targetUid)}`,
    payload: { role, userId: targetUid },
  });

  return NextResponse.json({
    ok: true,
    organizationId,
    role,
  });
}
