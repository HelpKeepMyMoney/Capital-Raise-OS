import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { serializeDocument } from "@/lib/api/v1/serialize";
import { completeOrgSignedUpload } from "@/lib/api/v1/signed-upload";
import { v1BadRequest, v1Error, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

export async function POST(
  req: NextRequest,
  routeCtx: { params: Promise<{ roomId: string; documentId: string }> },
) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId, documentId } = await routeCtx.params;
    const db = getAdminFirestore();
    const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!roomSnap.exists) return v1NotFound("Data room");
    const room = roomSnap.data() as { organizationId?: string };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");

    let body: {
      fileName?: string;
      mimeType?: string;
      kind?: string;
      parentFolderId?: string | null;
      replace?: boolean;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const existing = await db.collection(col.documents).doc(documentId).get();
    const replace = Boolean(body.replace) || existing.exists;

    const result = await completeOrgSignedUpload({
      db,
      bucket: getAdminBucket(),
      orgId: ctx.orgId,
      actorId: ctx.actorId,
      dataRoomId: roomId,
      documentId,
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream",
      kind: body.kind,
      parentFolderId: body.parentFolderId,
      replace,
    });

    if (!result.ok) {
      return v1Error("upload_failed", result.error, result.status);
    }

    return v1Json({ document: serializeDocument(result.document) }, replace ? 200 : 201);
  });
}
