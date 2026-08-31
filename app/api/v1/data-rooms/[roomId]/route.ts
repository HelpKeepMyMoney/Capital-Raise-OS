import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { DataRoom } from "@/lib/firestore/types";

function serializeRoom(room: DataRoom) {
  return {
    id: room.id,
    name: room.name,
    description: room.description ?? null,
    dealId: room.dealId ?? null,
    ndaRequired: room.ndaRequired,
    visibility: room.visibility ?? "open",
    downloadAllowed: room.downloadAllowed ?? true,
    archived: room.archived ?? false,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt ?? null,
  };
}

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ roomId: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId } = await routeCtx.params;
    const db = getAdminFirestore();
    const snap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!snap.exists) return v1NotFound("Data room");
    const room = { id: snap.id, ...(snap.data() as Omit<DataRoom, "id">) };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");
    return v1Json({ dataRoom: serializeRoom(room) });
  });
}
