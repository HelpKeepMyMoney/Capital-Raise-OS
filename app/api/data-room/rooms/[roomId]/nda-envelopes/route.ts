import { NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { listDataRoomNdaEnvelopesForRoom } from "@/lib/data-room/room-nda-envelopes";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { DataRoom } from "@/lib/firestore/types";
import { getMembership } from "@/lib/firestore/queries";

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

  const { roomId: raw } = await ctxParams.params;
  const roomId = typeof raw === "string" ? raw.trim() : "";
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const db = getAdminFirestore();
  const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = { id: roomSnap.id, ...(roomSnap.data() as Omit<DataRoom, "id">) };
  if (room.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const envelopes = await listDataRoomNdaEnvelopesForRoom(db, ctx.orgId, roomId);
  return NextResponse.json({ envelopes });
}
