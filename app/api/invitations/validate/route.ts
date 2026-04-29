import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { findInvitationByTokenHash, getDeal } from "@/lib/firestore/queries";
import { hashInviteToken } from "@/lib/invitations/token";
import { isInvitationConsumable } from "@/lib/invitations/invite-state";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const inv = await findInvitationByTokenHash(hashInviteToken(token));
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isInvitationConsumable(inv)) {
    return NextResponse.json({ error: "Invite is no longer valid" }, { status: 410 });
  }

  const db = getAdminFirestore();
  const orgSnap = await db.collection(col.organizations).doc(inv.organizationId).get();
  const orgName = orgSnap.exists ? ((orgSnap.data()?.name as string) ?? "") : "";

  let dealTitle: string | undefined;
  if (inv.scope === "deal" && inv.dealIds[0]) {
    const deal = await getDeal(inv.organizationId, inv.dealIds[0]);
    dealTitle = deal?.name;
  }

  const inviteEmail = inv.email?.trim() ? inv.email.trim().toLowerCase() : undefined;

  return NextResponse.json({
    organizationId: inv.organizationId,
    organizationName: orgName,
    scope: inv.scope,
    dealTitle,
    dealIds: inv.dealIds,
    emailRequired: Boolean(inviteEmail),
    /** When set, redeem only succeeds if the signed-in user’s email matches. */
    inviteEmail: inviteEmail ?? null,
    expiresAt: inv.expiresAt,
  });
}
