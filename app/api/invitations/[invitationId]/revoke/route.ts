import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { syncUserOrgClaimsAndDefaultOrg } from "@/lib/auth/sync-org-claims";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import type { InvestorAccess, InvestorInvitation } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";

function stripDealAccessFromMembership(
  access: InvestorAccess,
  invitation: InvestorInvitation,
): InvestorAccess | "remove" | null {
  if (access.scope !== "deal") return null;
  const removeDeals = new Set(invitation.dealIds ?? []);
  const removeRooms = new Set(invitation.dataRoomIds ?? []);

  const nextDealIds = access.dealIds.filter((id) => !removeDeals.has(id));
  const nextRoomIds = access.dataRoomIds.filter((id) => !removeRooms.has(id));

  if (nextDealIds.length === 0) return "remove";
  return { scope: "deal", dealIds: nextDealIds, dataRoomIds: nextRoomIds };
}

/** Sponsor revokes an invitation and, for accepted deal-scoped invites, strips matching deal/data-room access from the guest membership. */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { invitationId } = await context.params;
  const id = typeof invitationId === "string" ? invitationId.trim() : "";
  if (!id) return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });

  const db = getAdminFirestore();
  const invRef = db.collection(col.investorInvitations).doc(id);
  const snap = await invRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = { id: snap.id, ...(snap.data() as Omit<InvestorInvitation, "id">) };
  if (inv.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  if (inv.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await invRef.set({ revokedAt: now }, { merge: true });

  let membershipUpdated = false as boolean;
  let membershipRemoved = false as boolean;

  const acceptedUid =
    typeof inv.acceptedUserId === "string" ? inv.acceptedUserId.trim() : "";
  if (acceptedUid && inv.scope === "deal" && (inv.dealIds?.length ?? 0) > 0) {
    const memberRef = db.collection(col.organizationMembers).doc(memberDocId(ctx.orgId, acceptedUid));
    const ms = await memberRef.get();
    if (ms.exists) {
      const member = ms.data() as {
        organizationId?: string;
        role?: string;
        investorAccess?: InvestorAccess;
      };
      if (
        member.organizationId === ctx.orgId &&
        member.role === "investor_guest" &&
        member.investorAccess
      ) {
        const next = stripDealAccessFromMembership(member.investorAccess, inv);
        if (next === "remove") {
          await memberRef.delete();
          membershipRemoved = true;
        } else if (next !== null) {
          await memberRef.set({ investorAccess: next }, { merge: true });
          membershipUpdated = true;
        }
      }
    }
    if (membershipRemoved || membershipUpdated) {
      await syncUserOrgClaimsAndDefaultOrg(acceptedUid);
    }
  }

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "invite.revoke",
    resource: `${col.investorInvitations}/${id}`,
    payload: {
      scope: inv.scope,
      membershipRemoved,
      membershipUpdated,
      acceptedUserId: acceptedUid || undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    membershipRemoved,
    membershipUpdated,
    orgScopeNote:
      inv.scope === "org" && acceptedUid
        ? "Org-wide invites: invitation is revoked, but accepted guests keep portal access until you remove their membership (Platform Admin or Firestore)."
        : undefined,
  });
}
