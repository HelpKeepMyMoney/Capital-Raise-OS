import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { canDeleteOrganization } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { ORG_COOKIE } from "@/lib/constants";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  deleteOrganizationFirestore,
  deleteOrgStoragePrefix,
  removeOrganizationFromMembers,
} from "@/lib/organizations/delete-organization";
import { getMembership, getOrganization } from "@/lib/firestore/queries";
import { UserRoleSchema } from "@/lib/firestore/types";

const BodySchema = z.object({ confirmation: z.string() }).strict();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await ctx.params;
  if (orgId !== session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const membership = await getMembership(session.orgId, session.user.uid);
  const role = membership ? UserRoleSchema.safeParse(membership.role) : null;
  if (!role?.success || !canDeleteOrganization(role.data)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await getOrganization(orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const typed = parsed.data.confirmation.trim();
  if (typed !== org.name.trim()) {
    return NextResponse.json({ error: "Confirmation does not match organization name" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const { memberUids } = await deleteOrganizationFirestore(db, orgId);

  await removeOrganizationFromMembers(auth, db, orgId, memberUids);

  await deleteOrgStoragePrefix(orgId);

  await writeAuditLog({
    organizationId: orgId,
    actorId: session.user.uid,
    action: "organization.deleted",
    resource: `organizations/${orgId}`,
    payload: { memberCount: memberUids.length },
  });

  const res = NextResponse.json({ ok: true });

  res.cookies.set(ORG_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return res;
}
