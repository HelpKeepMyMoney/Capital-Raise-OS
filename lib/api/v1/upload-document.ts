import { randomUUID } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";
import { writeAuditLog } from "@/lib/audit";
import { validateDataRoomUploadFile } from "@/lib/data-room/allowed-upload";
import {
  DATA_ROOM_UPLOAD_MAX_BYTES,
  dataRoomStorageObjectPath,
  isSafeDocumentId,
} from "@/lib/data-room/data-room-upload";
import { authorizeDataRoomFileCreateForOrg } from "@/lib/data-room/org-upload-auth";
import { col } from "@/lib/firestore/paths";
import type { RoomDocument } from "@/lib/firestore/types";

export type UploadDocumentInput = {
  orgId: string;
  actorId: string;
  dataRoomId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  kind?: string;
  parentFolderId?: string | null;
  /** When replacing, pass existing document id. */
  replaceDocumentId?: string;
};

export type UploadDocumentResult =
  | { ok: true; document: RoomDocument }
  | { ok: false; status: number; error: string };

export async function uploadDataRoomDocument(
  db: Firestore,
  bucket: Bucket,
  input: UploadDocumentInput,
): Promise<UploadDocumentResult> {
  const fileName = input.fileName.trim();
  if (!fileName) return { ok: false, status: 400, error: "fileName required" };

  const validated = validateDataRoomUploadFile(fileName, input.mimeType);
  if (!validated.ok) return { ok: false, status: 400, error: validated.error };

  const sizeBytes = input.buffer.length;
  if (sizeBytes <= 0) return { ok: false, status: 400, error: "Empty file" };
  if (sizeBytes > DATA_ROOM_UPLOAD_MAX_BYTES) {
    return { ok: false, status: 400, error: "File too large (max 50MB)" };
  }

  const auth = await authorizeDataRoomFileCreateForOrg(db, input.orgId, {
    dataRoomId: input.dataRoomId,
    kind: input.kind ?? "other",
    parentFolderId: input.parentFolderId,
  });
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };

  const replaceId = input.replaceDocumentId?.trim();
  let docId: string;
  let version = 1;
  let previousStoragePath: string | undefined;

  if (replaceId) {
    if (!isSafeDocumentId(replaceId)) {
      return { ok: false, status: 400, error: "Invalid document id" };
    }
    const existing = await db.collection(col.documents).doc(replaceId).get();
    if (!existing.exists) return { ok: false, status: 404, error: "Document not found" };
    const ex = existing.data() as RoomDocument;
    if (ex.organizationId !== input.orgId || ex.dataRoomId !== input.dataRoomId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (ex.kind === "folder") return { ok: false, status: 400, error: "Cannot replace a folder" };
    docId = replaceId;
    version = (ex.version ?? 1) + 1;
    previousStoragePath = ex.storagePath;
  } else {
    docId = randomUUID();
  }

  const storagePath = dataRoomStorageObjectPath(input.orgId, input.dataRoomId, docId, fileName);
  const gcsFile = bucket.file(storagePath);
  await gcsFile.save(input.buffer, {
    contentType: validated.mimeType,
    resumable: false,
    metadata: { contentType: validated.mimeType },
  });

  const now = Date.now();
  const row: Record<string, unknown> = {
    id: docId,
    organizationId: input.orgId,
    dataRoomId: input.dataRoomId,
    name: fileName,
    storagePath,
    kind: auth.kind,
    viewCount: replaceId ? undefined : 0,
    sizeBytes,
    mimeType: validated.mimeType,
    version,
    updatedAt: now,
    ...(replaceId ? {} : { createdAt: now }),
  };
  if (auth.parentFolderId) row.parentFolderId = auth.parentFolderId;

  if (replaceId) {
    await db.collection(col.documents).doc(docId).update({
      name: fileName,
      storagePath,
      sizeBytes,
      mimeType: validated.mimeType,
      version,
      updatedAt: now,
    });
    if (previousStoragePath && previousStoragePath !== storagePath) {
      await bucket.file(previousStoragePath).delete().catch(() => undefined);
    }
  } else {
    await db.collection(col.documents).doc(docId).set(row);
  }

  await writeAuditLog({
    organizationId: input.orgId,
    actorId: input.actorId,
    action: replaceId ? "data_room.replace.api" : "data_room.upload.api",
    resource: `${col.documents}/${docId}`,
    payload: { dataRoomId: input.dataRoomId, name: fileName },
  });

  const saved = await db.collection(col.documents).doc(docId).get();
  return {
    ok: true,
    document: { id: docId, ...(saved.data() as Omit<RoomDocument, "id">) },
  };
}

export { serializeDocument } from "@/lib/api/v1/serialize";
