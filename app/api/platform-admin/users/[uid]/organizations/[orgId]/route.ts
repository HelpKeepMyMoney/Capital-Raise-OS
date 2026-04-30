import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { syncUserOrgClaimsFromFirestore, syncUserOrgClaimsAndDefaultOrg } from "@/lib/auth/sync-org-claims";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import type { InvestorAccess } from "@/lib/firestore/types";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { validateInvestorGuestAccess } from "@/lib/platform-admin/investor-access-validation";
import { PlatformAdminMembershipPatchSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ uid: string; orgId: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid: targetUid, orgId: organizationId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminMembershipPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.role === undefined && parsed.data.investorAccess === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const org = await getOrganization(organizationId);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const current = await getMembership(organizationId, targetUid);
  if (!current) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const nextRole = parsed.data.role ?? current.role;
  let nextAccess: InvestorAccess | undefined =
    parsed.data.investorAccess === null
      ? undefined
      : (parsed.data.investorAccess as InvestorAccess | undefined) ?? current.investorAccess;

  if (nextRole === "investor_guest") {
    if (!nextAccess) {
      return NextResponse.json(
        { error: "investor_guest requires investorAccess on the member document" },
        { status: 400 },
      );
    }
    const msg = await validateInvestorGuestAccess(organizationId, nextAccess);
    if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  } else {
    nextAccess = undefined;
  }

  const db = getAdminFirestore();
  const ref = db.collection(col.organizationMembers).doc(memberDocId(organizationId, targetUid));
  const updatePayload: Record<string, unknown> = { role: nextRole };
  if (nextRole === "investor_guest" && nextAccess) {
    updatePayload.investorAccess = nextAccess;
  } else {
    updatePayload.investorAccess = FieldValue.delete();
  }

  await ref.update(updatePayload);

  await syncUserOrgClaimsFromFirestore(targetUid);

  await writeAuditLog({
    organizationId,
    actorId: gate.user.uid,
    action: "platform_admin.member_update",
    resource: `${col.organizationMembers}/${memberDocId(organizationId, targetUid)}`,
    payload: { userId: targetUid, keys: ["role", "investorAccess"] },
  });

  return NextResponse.json({ ok: true, organizationId, role: nextRole });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ uid: string; orgId: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid: targetUid, orgId: organizationId } = await ctx.params;

  const org = await getOrganization(organizationId);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const db = getAdminFirestore();
  const ref = db.collection(col.organizationMembers).doc(memberDocId(organizationId, targetUid));
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  await ref.delete();
  await syncUserOrgClaimsAndDefaultOrg(targetUid);

  await writeAuditLog({
    organizationId,
    actorId: gate.user.uid,
    action: "platform_admin.member_remove",
    resource: `${col.organizationMembers}/${memberDocId(organizationId, targetUid)}`,
    payload: { userId: targetUid },
  });

  return NextResponse.json({ ok: true, organizationId });
}
