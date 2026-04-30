import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { syncUserOrgClaimsAndDefaultOrg } from "@/lib/auth/sync-org-claims";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";
import { deleteAllMembershipsForUser } from "@/lib/platform-admin/strip-memberships";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid } = await ctx.params;
  const auth = getAdminAuth();

  try {
    await auth.getUser(uid);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "auth/user-not-found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw e;
  }

  const { orgIdsAffected } = await deleteAllMembershipsForUser(uid);
  await syncUserOrgClaimsAndDefaultOrg(uid);

  const actorId = gate.user.uid;
  for (const organizationId of orgIdsAffected) {
    await writeAuditLog({
      organizationId,
      actorId,
      action: "platform_admin.user_strip_memberships",
      resource: `users/${uid}`,
      payload: {},
    });
  }

  return NextResponse.json({ ok: true, uid, organizationsTouched: orgIdsAffected.length });
}
