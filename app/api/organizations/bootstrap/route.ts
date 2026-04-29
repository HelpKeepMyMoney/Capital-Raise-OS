import { NextRequest, NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import { listUserOrganizations } from "@/lib/firestore/queries";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const existing = await listUserOrganizations(user.uid);
    if (existing.length) {
      return NextResponse.json({ error: "Already has organization" }, { status: 400 });
    }
    const { name } = (await req.json()) as { name?: string };
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const orgRef = db.collection(col.organizations).doc();
    const orgId = orgRef.id;
    const now = Date.now();
    const slug = `${slugify(name)}-${orgId.slice(0, 6)}`;

    const userPayload: Record<string, unknown> = {
      email: user.email ?? "",
      defaultOrganizationId: orgId,
      createdAt: now,
    };
    if (user.name) {
      userPayload.displayName = user.name;
    }

    const batch = db.batch();
    batch.set(db.collection(col.users).doc(user.uid), userPayload, { merge: true });
    batch.set(orgRef, {
      name: name.trim(),
      slug,
      createdAt: now,
      subscription: { plan: "none", status: "none" },
    });
    batch.set(db.collection(col.organizationMembers).doc(memberDocId(orgId, user.uid)), {
      organizationId: orgId,
      userId: user.uid,
      role: "founder",
      joinedAt: now,
    });
    await batch.commit();

    const prevOrgs = (user.orgs as Record<string, string> | undefined) ?? {};
    const claimsOrg = { ...prevOrgs, [orgId]: "founder" };
    await auth.setCustomUserClaims(user.uid, { orgs: claimsOrg });

    const res = NextResponse.json({ ok: true, organizationId: orgId });
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
      path: "/",
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bootstrap failed";
    console.error("[api/organizations/bootstrap]", e);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Bootstrap failed" },
      { status: 500 },
    );
  }
}
