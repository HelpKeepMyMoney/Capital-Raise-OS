import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { orgSlugTaken } from "@/lib/platform-admin/org-slug";
import { PlatformAdminOrganizationPatchSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";
import { getOrganization } from "@/lib/firestore/queries";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { orgId } = await ctx.params;
  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminOrganizationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, slug, subscription } = parsed.data;
  if (slug !== org.slug && (await orgSlugTaken(slug, orgId))) {
    return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
  }

  const db = getAdminFirestore();
  const patch: Record<string, unknown> = { name, slug };
  if (subscription) {
    patch.subscription = { ...org.subscription, ...subscription };
  }

  await db.collection(col.organizations).doc(orgId).update(patch);

  await writeAuditLog({
    organizationId: orgId,
    actorId: gate.user.uid,
    action: "platform_admin.organization.update",
    resource: `${col.organizations}/${orgId}`,
    payload: {
      keys: ["name", "slug", ...(subscription ? ["subscription"] : [])],
    },
  });

  return NextResponse.json({ ok: true, id: orgId, name, slug });
}
