import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { canEditOrganizationProfileRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { OrganizationPatchBodySchema } from "@/lib/organizations/patch-organization";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership, getOrganization } from "@/lib/firestore/queries";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = OrganizationPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, slug } = parsed.data;
  const db = getAdminFirestore();
  if (slug !== org.slug) {
    const dup = await db.collection(col.organizations).where("slug", "==", slug).limit(2).get();
    const taken = dup.docs.some((d) => d.id !== orgId);
    if (taken) {
      return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
    }
  }

  await db.collection(col.organizations).doc(orgId).update({
    name,
    slug,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorId: session.user.uid,
    action: "organization.update",
    resource: `${col.organizations}/${orgId}`,
    payload: { keys: ["name", "slug"] },
  });

  return NextResponse.json({ ok: true, id: orgId, name, slug });
}
