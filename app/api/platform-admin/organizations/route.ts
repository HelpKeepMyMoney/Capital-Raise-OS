import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { slugify } from "@/lib/organizations/slug";
import { orgSlugTaken } from "@/lib/platform-admin/org-slug";
import { PlatformAdminCreateOrganizationSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";
import { listOrganizationsForAdmin } from "@/lib/firestore/queries";

export async function GET() {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;
  const organizations = await listOrganizationsForAdmin(500);
  return NextResponse.json({ organizations });
}

export async function POST(req: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminCreateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;
  let slug = parsed.data.slug;

  const db = getAdminFirestore();
  const orgRef = db.collection(col.organizations).doc();
  const orgId = orgRef.id;

  if (!slug) {
    slug = `${slugify(name)}-${orgId.slice(0, 6)}`;
    if (await orgSlugTaken(slug)) {
      slug = `${slugify(name)}-${orgId.slice(0, 8)}`;
    }
  } else if (await orgSlugTaken(slug)) {
    return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
  }

  const now = Date.now();
  await orgRef.set({
    name,
    slug,
    createdAt: now,
    subscription: { plan: "none", status: "none" },
  });

  await writeAuditLog({
    organizationId: orgId,
    actorId: gate.user.uid,
    action: "platform_admin.organization.create",
    resource: `${col.organizations}/${orgId}`,
    payload: { name, slug },
  });

  return NextResponse.json({ ok: true, id: orgId, name, slug });
}
