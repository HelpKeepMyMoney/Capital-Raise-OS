import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { UserDoc } from "@/lib/firestore/types";
import { getOrganization } from "@/lib/firestore/queries";
import { PlatformAdminPatchUserSchema } from "@/lib/platform-admin/schemas";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ uid: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid } = await ctx.params;
  const auth = getAdminAuth();

  let userRecord;
  try {
    userRecord = await auth.getUser(uid);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "auth/user-not-found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw e;
  }

  const db = getAdminFirestore();
  const userDocSnap = await db.collection(col.users).doc(uid).get();
  const profile = userDocSnap.exists ? (userDocSnap.data() as UserDoc & { createdAt?: number }) : null;

  const membershipsSnap = await db.collection(col.organizationMembers).where("userId", "==", uid).get();
  const memberships: {
    organizationId: string;
    organizationName: string;
    role: string;
    investorAccess?: unknown;
  }[] = [];
  for (const d of membershipsSnap.docs) {
    const m = d.data() as {
      organizationId?: string;
      role?: string;
      investorAccess?: unknown;
    };
    if (!m.organizationId || !m.role) continue;
    const org = await getOrganization(m.organizationId);
    memberships.push({
      organizationId: m.organizationId,
      organizationName: org?.name ?? m.organizationId,
      role: m.role,
      ...(m.investorAccess !== undefined ? { investorAccess: m.investorAccess } : {}),
    });
  }
  memberships.sort((a, b) => a.organizationName.localeCompare(b.organizationName));

  return NextResponse.json({
    uid: userRecord.uid,
    email: userRecord.email ?? null,
    emailVerified: userRecord.emailVerified,
    displayName: userRecord.displayName ?? null,
    disabled: Boolean(userRecord.disabled),
    photoURL: userRecord.photoURL ?? null,
    customClaims: userRecord.customClaims ?? {},
    metadata: {
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime ?? null,
    },
    profile: profile && {
      email: profile.email,
      displayName: profile.displayName,
      defaultOrganizationId: profile.defaultOrganizationId,
      photoURL: profile.photoURL,
      createdAt: profile.createdAt ?? null,
    },
    memberships,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ uid: string }> },
) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const { uid } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminPatchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { displayName, email, disabled } = parsed.data;
  if (
    displayName === undefined &&
    email === undefined &&
    disabled === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  let userRecord;
  try {
    userRecord = await auth.getUser(uid);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "auth/user-not-found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw e;
  }

  const membershipsSnap = await db.collection(col.organizationMembers).where("userId", "==", uid).get();
  const orgIdsForAudit = new Set<string>();
  for (const d of membershipsSnap.docs) {
    const oid = (d.data() as { organizationId?: string }).organizationId;
    if (oid) orgIdsForAudit.add(oid);
  }
  if (orgIdsForAudit.size === 0) {
    const def = (await db.collection(col.users).doc(uid).get()).data()?.defaultOrganizationId;
    if (typeof def === "string" && def) orgIdsForAudit.add(def);
  }

  try {
    await auth.updateUser(uid, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(disabled !== undefined ? { disabled } : {}),
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("[platform-admin PATCH user]", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  const firestoreUpdates: Record<string, unknown> = {};
  if (displayName !== undefined) firestoreUpdates.displayName = displayName;
  if (email !== undefined) firestoreUpdates.email = email;
  if (Object.keys(firestoreUpdates).length) {
    await db.collection(col.users).doc(uid).set(firestoreUpdates, { merge: true });
  }

  const actorId = gate.user.uid;
  for (const organizationId of orgIdsForAudit) {
    await writeAuditLog({
      organizationId,
      actorId,
      action: "platform_admin.user_update",
      resource: `users/${uid}`,
      payload: {
        ...(displayName !== undefined ? { displayName: true } : {}),
        ...(email !== undefined ? { email: true } : {}),
        ...(disabled !== undefined ? { disabled } : {}),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    uid,
    email: email ?? userRecord.email,
    displayName: displayName ?? userRecord.displayName,
    disabled: disabled ?? Boolean(userRecord.disabled),
  });
}
