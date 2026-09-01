import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { serializeDocument, uploadDataRoomDocument } from "@/lib/api/v1/upload-document";
import { v1BadRequest, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { listDocumentsForDataRoom } from "@/lib/firestore/queries";

export async function GET(req: NextRequest, routeCtx: { params: Promise<{ roomId: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId } = await routeCtx.params;
    const db = getAdminFirestore();
    const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!roomSnap.exists) return v1NotFound("Data room");
    const room = roomSnap.data() as { organizationId?: string };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");

    const docs = await listDocumentsForDataRoom(ctx.orgId, roomId);
    return v1Json({ documents: docs.map(serializeDocument) });
  });
}

export async function POST(req: NextRequest, routeCtx: { params: Promise<{ roomId: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId } = await routeCtx.params;
    const db = getAdminFirestore();
    const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!roomSnap.exists) return v1NotFound("Data room");
    const room = roomSnap.data() as { organizationId?: string };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return v1BadRequest('Multipart field "file" is required');
    }

    const kind = typeof form.get("kind") === "string" ? String(form.get("kind")) : "other";
    const parentFolderId =
      typeof form.get("parentFolderId") === "string" ? String(form.get("parentFolderId")) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDataRoomDocument(db, getAdminBucket(), {
      orgId: ctx.orgId,
      actorId: ctx.actorId,
      dataRoomId: roomId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      kind,
      parentFolderId,
    });

    if (!result.ok) {
      const { v1Error } = await import("@/lib/api/v1/responses");
      return v1Error("upload_failed", result.error, result.status);
    }

    return v1Json({ document: serializeDocument(result.document) }, 201);
  });
}
