import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { parseDealStatusWrite, rejectForbiddenApiActions } from "@/lib/api/v1/guards";
import { v1BadRequest, v1Forbidden, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { serializeDeal } from "@/lib/api/v1/serialize";
import { writeAuditLog } from "@/lib/audit";
import { DealPatchBodySchema, dealPatchToFirestoreUpdate } from "@/lib/deals/patch-deal";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getDeal, listActiveDataRoomsForDeal } from "@/lib/firestore/queries";

function parseLinkedDataRoomId(raw: unknown): { ok: true; value?: string | null } | { ok: false } {
  if (raw === undefined) return { ok: true };
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  const id = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false };
  }
  return { ok: true, value: id };
}

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id } = await routeCtx.params;
    const deal = await getDeal(ctx.orgId, id);
    if (!deal) return v1NotFound("Deal");
    const rooms = await listActiveDataRoomsForDeal(ctx.orgId, id);
    return v1Json({ deal: serializeDeal(deal, rooms.map((r) => r.id)) });
  });
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { id: dealId } = await routeCtx.params;
    const deal = await getDeal(ctx.orgId, dealId);
    if (!deal) return v1NotFound("Deal");

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const bodyObj = (raw ?? {}) as Record<string, unknown>;
    const forbidden = rejectForbiddenApiActions(bodyObj);
    if (!forbidden.ok) return v1Forbidden(forbidden.message);

    const statusCheck = parseDealStatusWrite(bodyObj.status);
    if (!statusCheck.ok) return v1BadRequest(statusCheck.message);

    const { linkedDataRoomId: linkedRaw, ...rest } = bodyObj;
    const linked = parseLinkedDataRoomId(linkedRaw);
    if (!linked.ok) return v1BadRequest("linkedDataRoomId must be a UUID or null");

    const parsed = DealPatchBodySchema.safeParse(rest);
    if (!parsed.success) {
      return v1BadRequest("Invalid body", parsed.error.flatten());
    }

    const updates = dealPatchToFirestoreUpdate(parsed.data);
    const db = getAdminFirestore();
    const linkedDataRoomId = linked.value;

    if (linkedDataRoomId !== undefined) {
      if (linkedDataRoomId === null) {
        const roomsSnap = await db
          .collection(col.dataRooms)
          .where("organizationId", "==", ctx.orgId)
          .where("dealId", "==", dealId)
          .limit(20)
          .get();
        for (const d of roomsSnap.docs) {
          await d.ref.update({ dealId: null, updatedAt: Date.now() });
        }
      } else {
        const roomRef = db.collection(col.dataRooms).doc(linkedDataRoomId);
        const roomSnap = await roomRef.get();
        if (!roomSnap.exists) return v1NotFound("Data room");
        const room = roomSnap.data() as { organizationId?: string };
        if (room.organizationId !== ctx.orgId) {
          return v1Forbidden("Data room belongs to another organization.");
        }
        await roomRef.update({ dealId, updatedAt: Date.now() });
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.collection(col.deals).doc(dealId).update(updates);
    }

    await writeAuditLog({
      organizationId: ctx.orgId,
      actorId: ctx.actorId,
      action: "deal.update.api",
      resource: `${col.deals}/${dealId}`,
      payload: {
        keys: [...Object.keys(updates), ...(linkedDataRoomId !== undefined ? ["linkedDataRoomId"] : [])],
      },
    });

    const updated = await getDeal(ctx.orgId, dealId);
    if (!updated) return v1NotFound("Deal");
    const rooms = await listActiveDataRoomsForDeal(ctx.orgId, dealId);
    return v1Json({ deal: serializeDeal(updated, rooms.map((r) => r.id)) });
  });
}
