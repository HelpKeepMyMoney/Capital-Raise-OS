import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { v1BadRequest, v1Forbidden, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { writeAuditLog } from "@/lib/audit";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, listDataRoomsForOrganization } from "@/lib/firestore/queries";
import type { DataRoom, DataRoomVisibility } from "@/lib/firestore/types";

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

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    const rooms = await listDataRoomsForOrganization(ctx.orgId, 120);
    return v1Json({ dataRooms: rooms.filter((r) => !r.archived).map(serializeRoom) });
  });
}

export async function POST(req: NextRequest) {
  return withApiKeyAuth(req, async (ctx) => {
    let body: {
      name?: string;
      dealId?: string | null;
      description?: string | null;
      ndaRequired?: boolean;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return v1BadRequest("name is required");

    let dealId: string | undefined;
    if (body.dealId != null) {
      const raw = typeof body.dealId === "string" ? body.dealId.trim() : "";
      if (raw) {
        const deal = await getDeal(ctx.orgId, raw);
        if (!deal) return v1NotFound("Deal");
        dealId = raw;
      }
    }

    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 4000) : undefined;
    const ndaRequired = Boolean(body.ndaRequired);

    const id = randomUUID();
    const now = Date.now();
    const payload: Record<string, unknown> = {
      id,
      organizationId: ctx.orgId,
      name,
      ndaRequired,
      visibility: "open" satisfies DataRoomVisibility,
      downloadAllowed: true,
      createdAt: now,
      updatedAt: now,
    };
    if (dealId) payload.dealId = dealId;
    if (description) payload.description = description;

    const db = getAdminFirestore();
    await db.collection(col.dataRooms).doc(id).set(payload);

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "data_room.create.api",
      resource: `${col.dataRooms}/${id}`,
      payload: { name, dealId: dealId ?? null },
    });

    return v1Json({ dataRoom: serializeRoom({ id, ...(payload as Omit<DataRoom, "id">) }) }, 201);
  });
}
