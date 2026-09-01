import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { dataRoomPatchToUpdate } from "@/lib/api/v1/room-patch";
import { v1BadRequest, v1Error, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { serializeRoom } from "@/lib/api/v1/serialize";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { DataRoom } from "@/lib/firestore/types";

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

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ roomId: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId } = await routeCtx.params;
    const db = getAdminFirestore();
    const snap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!snap.exists) return v1NotFound("Data room");
    const room = { id: snap.id, ...(snap.data() as Omit<DataRoom, "id">) };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const result = await dataRoomPatchToUpdate(ctx.orgId, body);
    if (!result.ok) {
      return v1Error(result.status === 404 ? "not_found" : "bad_request", result.error, result.status);
    }

    await db.collection(col.dataRooms).doc(roomId).update(result.updates);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "data_room.update.api",
      resource: `${col.dataRooms}/${roomId}`,
      payload: { keys: Object.keys(result.updates) },
    });

    const fresh = await db.collection(col.dataRooms).doc(roomId).get();
    const updated = { id: fresh.id, ...(fresh.data() as Omit<DataRoom, "id">) };
    return v1Json({ dataRoom: serializeRoom(updated) });
  });
}
