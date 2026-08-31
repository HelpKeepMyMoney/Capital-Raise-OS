import { NextRequest, NextResponse } from "next/server";
import { canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { createOrgApiKey, listOrgApiKeys } from "@/lib/api-keys/queries";
import { writeAuditLog } from "@/lib/audit";
import { getMembership } from "@/lib/firestore/queries";
import { col } from "@/lib/firestore/paths";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await ctx.params;
  if (orgId !== session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrganizationProfileRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await listOrgApiKeys(orgId);
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await ctx.params;
  if (orgId !== session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrganizationProfileRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { key, secret } = await createOrgApiKey({
    organizationId: orgId,
    name,
    createdByUid: session.user.uid,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorId: session.user.uid,
    action: "api_key.create",
    resource: `${col.orgApiKeys}/${key.id}`,
    payload: { name, prefix: key.prefix },
  });

  return NextResponse.json({ key, secret });
}
