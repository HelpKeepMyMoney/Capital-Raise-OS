import { NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { investorDisplayName } from "@/lib/investors/display-name";
import { isInvestorActive, listInvestors, getMembership } from "@/lib/firestore/queries";
import type { DataRoom } from "@/lib/firestore/types";

export async function GET(
  _req: Request,
  ctxParams: { params: Promise<{ roomId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await ctxParams.params;
  if (!roomId?.trim()) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const db = getAdminFirestore();
  const roomSnap = await db.collection(col.dataRooms).doc(roomId.trim()).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = { id: roomSnap.id, ...(roomSnap.data() as Omit<DataRoom, "id">) };
  if (room.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dealId = typeof room.dealId === "string" ? room.dealId.trim() : "";
  if (!dealId) {
    return NextResponse.json({
      investors: [] as { id: string; email: string; displayName: string }[],
      noDealLinked: true,
    });
  }

  const investors = await listInvestors(ctx.orgId, { includeArchived: false });
  const eligible = investors.filter((inv) => {
    if (!isInvestorActive(inv)) return false;
    const email = inv.email?.trim();
    if (!email) return false;
    return inv.interestedDealIds?.includes(dealId) ?? false;
  });

  return NextResponse.json({
    dealId,
    investors: eligible.map((inv) => ({
      id: inv.id,
      email: inv.email!.trim().toLowerCase(),
      displayName: investorDisplayName(inv),
    })),
    noDealLinked: false,
  });
}
