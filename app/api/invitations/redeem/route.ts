import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { Auth } from "firebase-admin/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import type { InvestorAccess } from "@/lib/firestore/types";
import { findInvitationByTokenHash } from "@/lib/firestore/queries";
import { hashInviteToken } from "@/lib/invitations/token";
import {
  invitationEmailMatches,
  isInvitationConsumable,
} from "@/lib/invitations/invite-state";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { idToken?: string; inviteToken?: string };

  const rawInvite = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
  if (!rawInvite || !idToken) {
    return NextResponse.json({ error: "idToken and inviteToken required" }, { status: 400 });
  }

  const auth = getAdminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid id token" }, { status: 401 });
  }

  const uid = decoded.uid;
  const email = decoded.email ?? "";
  const inv = await findInvitationByTokenHash(hashInviteToken(rawInvite));
  if (!inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  if (!isInvitationConsumable(inv)) {
    return NextResponse.json({ error: "Invite is no longer valid" }, { status: 410 });
  }

  if (inv.revokedAt) {
    return NextResponse.json({ error: "Invite was revoked" }, { status: 410 });
  }

  if (!invitationEmailMatches(inv, email)) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address. Sign in with that email." },
      { status: 403 },
    );
  }

  if (inv.acceptedAt != null && inv.acceptedUserId && inv.acceptedUserId !== uid) {
    return NextResponse.json({ error: "This invite link was already accepted" }, { status: 409 });
  }

  const orgId = inv.organizationId;
  const db = getAdminFirestore();
  const memberRef = db.collection(col.organizationMembers).doc(memberDocId(orgId, uid));
  const existing = await memberRef.get();
  if (existing.exists) {
    await syncCustomClaims(uid, auth);
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      organizationId: orgId,
      redirectTo:
        inv.scope === "deal" && inv.dealIds[0] ? `/deals/${inv.dealIds[0]}` : "/deals",
    });
  }

  let investorAccess: InvestorAccess;
  if (inv.scope === "org") {
    investorAccess = { scope: "org" };
  } else {
    investorAccess = {
      scope: "deal",
      dealIds: inv.dealIds,
      dataRoomIds: inv.dataRoomIds,
    };
  }

  const now = Date.now();
  const batch = db.batch();

  batch.set(memberRef, {
    organizationId: orgId,
    userId: uid,
    role: "investor_guest",
    joinedAt: now,
    investorAccess,
    invitedBy: inv.createdBy,
  });

  const invRef = db.collection(col.investorInvitations).doc(inv.id);

  const displayName =
    decoded.name ??
    decoded.email?.split("@")[0] ??
    email.split("@")[0] ??
    "Investor";

  if (inv.linkedInvestorId) {
    batch.update(invRef, { acceptedAt: now, acceptedUserId: uid });
    batch.update(db.collection(col.investors).doc(inv.linkedInvestorId), {
      linkedUserId: uid,
      email: email || undefined,
      updatedAt: now,
    });
  } else {
    const investorId = randomUUID();
    batch.set(db.collection(col.investors).doc(investorId), {
      id: investorId,
      organizationId: orgId,
      name: displayName,
      email: email || undefined,
      pipelineStage: "responded",
      linkedUserId: uid,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(invRef, {
      acceptedAt: now,
      acceptedUserId: uid,
      linkedInvestorId: investorId,
    });
  }

  await batch.commit();

  await syncCustomClaims(uid, auth);

  await writeAuditLog({
    organizationId: orgId,
    actorId: uid,
    action: "invite.redeem",
    resource: `${col.investorInvitations}/${inv.id}`,
    payload: { scope: inv.scope },
  });

  return NextResponse.json({
    ok: true,
    alreadyMember: false as const,
    organizationId: orgId,
    redirectTo: inv.scope === "deal" && inv.dealIds[0] ? `/deals/${inv.dealIds[0]}` : "/deals",
    /** Client should call `getIdToken(true)`, then `POST /api/auth/session` with `organizationId`. */
  });
}

async function syncCustomClaims(uid: string, auth: Auth) {
  const userRecord = await auth.getUser(uid);
  const prev = userRecord.customClaims ?? {};
  const orgsSnap = await getAdminFirestore()
    .collection(col.organizationMembers)
    .where("userId", "==", uid)
    .get();
  const orgs = { ...(typeof prev.orgs === "object" ? (prev.orgs as Record<string, string>) : {}) };
  for (const d of orgsSnap.docs) {
    const x = d.data() as { organizationId?: string; role?: string };
    if (x.organizationId && x.role) orgs[x.organizationId] = x.role;
  }
  await auth.setCustomUserClaims(uid, { ...prev, orgs });
}
