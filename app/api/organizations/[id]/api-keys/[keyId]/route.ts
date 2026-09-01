import { NextRequest, NextResponse } from "next/server";
import { canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { revokeOrgApiKey } from "@/lib/api-keys/queries";
import { writeAuditLog } from "@/lib/audit";
import { getMembership } from "@/lib/firestore/queries";
import { col } from "@/lib/firestore/paths";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; keyId: string }> },
) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId, keyId } = await ctx.params;
  if (orgId !== session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const m = await getMembership(session.orgId, session.user.uid);
  if (!m || !canEditOrganizationProfileRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const ok = await revokeOrgApiKey(orgId, keyId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      organizationId: orgId,
      actorId: session.user.uid,
      action: "api_key.revoke",
      resource: `${col.orgApiKeys}/${keyId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api-keys DELETE]", err);
    const message = err instanceof Error ? err.message : "Failed to revoke API key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
