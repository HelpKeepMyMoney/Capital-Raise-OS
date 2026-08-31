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

export async function createOrgSignedUpload(input: {
  db: Firestore;
  bucket: Bucket;
  orgId: string;
  dataRoomId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind?: string;
  parentFolderId?: string | null;
  replaceDocumentId?: string;
}): Promise<
  | { ok: true; documentId: string; uploadUrl: string; contentType: string; storagePath: string }
  | { ok: false; status: number; error: string }
> {
  const fileName = input.fileName.trim();
  if (!fileName) return { ok: false, status: 400, error: "fileName required" };

  const validated = validateDataRoomUploadFile(fileName, input.mimeType);
  if (!validated.ok) return { ok: false, status: 400, error: validated.error };

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, status: 400, error: "sizeBytes required" };
  }
  if (input.sizeBytes > DATA_ROOM_UPLOAD_MAX_BYTES) {
    return { ok: false, status: 400, error: "File too large (max 50MB)" };
  }

  const auth = await authorizeDataRoomFileCreateForOrg(input.db, input.orgId, {
    dataRoomId: input.dataRoomId,
    kind: input.kind ?? "other",
    parentFolderId: input.parentFolderId,
  });
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };

  let documentId: string;
  const replaceId = input.replaceDocumentId?.trim();
  if (replaceId) {
    if (!isSafeDocumentId(replaceId)) return { ok: false, status: 400, error: "Invalid document id" };
    const existing = await input.db.collection(col.documents).doc(replaceId).get();
    if (!existing.exists) return { ok: false, status: 404, error: "Document not found" };
    const ex = existing.data() as RoomDocument;
    if (ex.organizationId !== input.orgId || ex.dataRoomId !== input.dataRoomId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (ex.kind === "folder") return { ok: false, status: 400, error: "Cannot replace a folder" };
    documentId = replaceId;
  } else {
    documentId = randomUUID();
  }

  const storagePath = dataRoomStorageObjectPath(input.orgId, input.dataRoomId, documentId, fileName);
  const [uploadUrl] = await input.bucket.file(storagePath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 20 * 60 * 1000,
    contentType: validated.mimeType,
  });

  return {
    ok: true,
    documentId,
    uploadUrl,
    contentType: validated.mimeType,
    storagePath,
  };
}

export async function completeOrgSignedUpload(input: {
  db: Firestore;
  bucket: Bucket;
  orgId: string;
  actorId: string;
  dataRoomId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  kind?: string;
  parentFolderId?: string | null;
  replace?: boolean;
}): Promise<{ ok: true; document: RoomDocument } | { ok: false; status: number; error: string }> {
  const fileName = input.fileName.trim();
  if (!fileName) return { ok: false, status: 400, error: "fileName required" };
  if (!isSafeDocumentId(input.documentId)) return { ok: false, status: 400, error: "Invalid document id" };

  const validated = validateDataRoomUploadFile(fileName, input.mimeType);
  if (!validated.ok) return { ok: false, status: 400, error: validated.error };

  const auth = await authorizeDataRoomFileCreateForOrg(input.db, input.orgId, {
    dataRoomId: input.dataRoomId,
    kind: input.kind ?? "other",
    parentFolderId: input.parentFolderId,
  });
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };

  const storagePath = dataRoomStorageObjectPath(
    input.orgId,
    input.dataRoomId,
    input.documentId,
    fileName,
  );
  const gcsFile = input.bucket.file(storagePath);
  const [exists] = await gcsFile.exists();
  if (!exists) {
    return { ok: false, status: 400, error: "Upload not found; PUT the file to uploadUrl first." };
  }

  const [metadata] = await gcsFile.getMetadata();
  const rawSize = metadata.size;
  const sizeBytes =
    typeof rawSize === "string" ? Number.parseInt(rawSize, 10) : typeof rawSize === "number" ? rawSize : 0;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, status: 400, error: "Could not read uploaded file size" };
  }
  if (sizeBytes > DATA_ROOM_UPLOAD_MAX_BYTES) {
    await gcsFile.delete().catch(() => undefined);
    return { ok: false, status: 400, error: "File too large (max 50MB)" };
  }

  const now = Date.now();
  const ref = input.db.collection(col.documents).doc(input.documentId);
  const existing = await ref.get();

  if (input.replace) {
    if (!existing.exists) return { ok: false, status: 404, error: "Document not found" };
    const ex = existing.data() as RoomDocument;
    if (ex.organizationId !== input.orgId || ex.dataRoomId !== input.dataRoomId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    const previousPath = ex.storagePath;
    await ref.update({
      name: fileName,
      storagePath,
      sizeBytes,
      mimeType: validated.mimeType,
      version: (ex.version ?? 1) + 1,
      updatedAt: now,
    });
    if (previousPath && previousPath !== storagePath) {
      await input.bucket.file(previousPath).delete().catch(() => undefined);
    }
  } else {
    if (existing.exists) {
      return { ok: false, status: 409, error: "Document already exists" };
    }
    const row: Record<string, unknown> = {
      id: input.documentId,
      organizationId: input.orgId,
      dataRoomId: input.dataRoomId,
      name: fileName,
      storagePath,
      kind: auth.kind,
      viewCount: 0,
      sizeBytes,
      mimeType: validated.mimeType,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    if (auth.parentFolderId) row.parentFolderId = auth.parentFolderId;
    await ref.set(row);
  }

  await writeAuditLog({
    organizationId: input.orgId,
    actorId: input.actorId,
    action: input.replace ? "data_room.replace.api" : "data_room.upload.api",
    resource: `${col.documents}/${input.documentId}`,
    payload: { dataRoomId: input.dataRoomId, name: fileName },
  });

  const saved = await ref.get();
  return {
    ok: true,
    document: { id: input.documentId, ...(saved.data() as Omit<RoomDocument, "id">) },
  };
}
