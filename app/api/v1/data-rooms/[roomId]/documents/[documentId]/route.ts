import { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/v1/with-auth";
import { serializeDocument, uploadDataRoomDocument } from "@/lib/api/v1/upload-document";
import { v1BadRequest, v1Json, v1NotFound } from "@/lib/api/v1/responses";
import { authorizeRoomDocumentReadForOrg } from "@/lib/data-room/authorize-room-document-read";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { RoomDocument } from "@/lib/firestore/types";

export async function GET(
  req: NextRequest,
  routeCtx: { params: Promise<{ roomId: string; documentId: string }> },
) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId, documentId } = await routeCtx.params;
    const db = getAdminFirestore();
    const snap = await db.collection(col.documents).doc(documentId).get();
    if (!snap.exists) return v1NotFound("Document");
    const doc = { id: snap.id, ...(snap.data() as Omit<RoomDocument, "id">) };
    if (doc.organizationId !== ctx.orgId || doc.dataRoomId !== roomId) {
      return v1NotFound("Document");
    }

    const auth = await authorizeRoomDocumentReadForOrg(ctx.orgId, documentId);
    let downloadUrl: string | null = null;
    if (auth.ok) {
      const bucket = getAdminBucket();
      const [url] = await bucket.file(auth.storagePath).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });
      downloadUrl = url;
    }

    return v1Json({
      document: { ...serializeDocument(doc), downloadUrl },
    });
  });
}

export async function PUT(
  req: NextRequest,
  routeCtx: { params: Promise<{ roomId: string; documentId: string }> },
) {
  return withApiKeyAuth(req, async (ctx) => {
    const { roomId, documentId } = await routeCtx.params;
    const db = getAdminFirestore();
    const snap = await db.collection(col.documents).doc(documentId).get();
    if (!snap.exists) return v1NotFound("Document");
    const doc = snap.data() as RoomDocument;
    if (doc.organizationId !== ctx.orgId || doc.dataRoomId !== roomId) {
      return v1NotFound("Document");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return v1BadRequest('Multipart field "file" is required');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDataRoomDocument(db, getAdminBucket(), {
      orgId: ctx.orgId,
      actorId: ctx.actorId,
      dataRoomId: roomId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      kind: doc.kind,
      parentFolderId: doc.parentFolderId,
      replaceDocumentId: documentId,
    });

    if (!result.ok) {
      const { v1Error } = await import("@/lib/api/v1/responses");
      return v1Error("upload_failed", result.error, result.status);
    }

    return v1Json({ document: serializeDocument(result.document) });
  });
}
