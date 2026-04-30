import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  deleteOrganizationFirestore,
  deleteOrgStoragePrefix,
  removeOrganizationFromMembers,
} from "@/lib/organizations/delete-organization";
import { PlatformAdminDeleteOrganizationSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";
import { col } from "@/lib/firestore/paths";
import { getOrganization } from "@/lib/firestore/queries";

export async function POST(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { orgId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminDeleteOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.confirmation !== org.name.trim()) {
    return NextResponse.json({ error: "Confirmation does not match organization name" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const { memberUids } = await deleteOrganizationFirestore(db, orgId);

  await removeOrganizationFromMembers(auth, db, orgId, memberUids);

  await deleteOrgStoragePrefix(orgId);

  await writeAuditLog({
    organizationId: orgId,
    actorId: gate.user.uid,
    action: "organization.deleted",
    resource: `${col.organizations}/${orgId}`,
    payload: { source: "platform_admin", memberCount: memberUids.length },
  });

  return NextResponse.json({ ok: true });
}
