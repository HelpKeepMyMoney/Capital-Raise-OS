import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { createOrgSignedUpload } from "@/lib/api/v1/signed-upload";
import { v1BadRequest, v1Error, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

export async function POST(req: NextRequest, routeCtx: { params: Promise<{ roomId: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId } = await routeCtx.params;
    const db = getAdminFirestore();
    const roomSnap = await db.collection(col.dataRooms).doc(roomId).get();
    if (!roomSnap.exists) return v1NotFound("Data room");
    const room = roomSnap.data() as { organizationId?: string };
    if (room.organizationId !== ctx.orgId) return v1NotFound("Data room");

    let body: {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      kind?: string;
      parentFolderId?: string | null;
      replaceDocumentId?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return v1BadRequest("Invalid JSON body");
    }

    const result = await createOrgSignedUpload({
      db,
      bucket: getAdminBucket(),
      orgId: ctx.orgId,
      dataRoomId: roomId,
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : -1,
      kind: body.kind,
      parentFolderId: body.parentFolderId,
      replaceDocumentId: body.replaceDocumentId,
    });

    if (!result.ok) {
      return v1Error("upload_failed", result.error, result.status);
    }

    return v1Json({
      documentId: result.documentId,
      uploadUrl: result.uploadUrl,
      contentType: result.contentType,
      expiresInSeconds: 20 * 60,
    });
  });
}
