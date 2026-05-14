import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { writeAuditLog } from "@/lib/audit";
import {
  DATA_ROOM_UPLOAD_MAX_BYTES,
  dataRoomStorageObjectPath,
  authorizeDataRoomFileCreate,
  isSafeDocumentId,
} from "@/lib/data-room/data-room-upload";

type Body = {
  docId?: string;
  dataRoomId?: string;
  kind?: string;
  parentFolderId?: string | null;
  fileName?: string;
};

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const docId = typeof body.docId === "string" ? body.docId.trim() : "";
  if (!docId || !isSafeDocumentId(docId)) {
    return NextResponse.json({ error: "Invalid docId" }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  if (!fileName) {
    return NextResponse.json({ error: "fileName required" }, { status: 400 });
  }

  const dataRoomId = typeof body.dataRoomId === "string" ? body.dataRoomId.trim() : "";
  if (!dataRoomId) {
    return NextResponse.json({ error: "dataRoomId required" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const existing = await db.collection(col.documents).doc(docId).get();
  if (existing.exists) {
    return NextResponse.json({ error: "Document already exists" }, { status: 409 });
  }

  const auth = await authorizeDataRoomFileCreate(db, ctx.orgId, ctx.user.uid, {
    dataRoomId,
    kind: typeof body.kind === "string" ? body.kind : "other",
    parentFolderId: body.parentFolderId,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storagePath = dataRoomStorageObjectPath(ctx.orgId, dataRoomId, docId, fileName);
  const bucket = getAdminBucket();
  const gcsFile = bucket.file(storagePath);

  const [exists] = await gcsFile.exists();
  if (!exists) {
    return NextResponse.json({ error: "Upload not found; try uploading again." }, { status: 400 });
  }

  const [metadata] = await gcsFile.getMetadata();
  const rawSize = metadata.size;
  const sizeBytes =
    typeof rawSize === "string" ? Number.parseInt(rawSize, 10) : typeof rawSize === "number" ? rawSize : 0;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: "Could not read uploaded file size" }, { status: 400 });
  }
  if (sizeBytes > DATA_ROOM_UPLOAD_MAX_BYTES) {
    await gcsFile.delete().catch(() => undefined);
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const mimeType =
    typeof metadata.contentType === "string" && metadata.contentType.trim()
      ? metadata.contentType.trim()
      : "application/octet-stream";

  const now = Date.now();
  const displayName = fileName.trim() || fileName;

  const row: Record<string, unknown> = {
    id: docId,
    organizationId: ctx.orgId,
    dataRoomId,
    name: displayName,
    storagePath,
    kind: auth.kind,
    viewCount: 0,
    sizeBytes,
    mimeType,
    createdByUid: ctx.user.uid,
    version: 1,
    createdAt: now,
  };
  if (auth.parentFolderId) row.parentFolderId = auth.parentFolderId;
  await db.collection(col.documents).doc(docId).set(row);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.upload",
    resource: `${col.documents}/${docId}`,
    payload: { dataRoomId, kind: auth.kind, name: displayName },
  });

  return NextResponse.json({
    id: docId,
    name: displayName,
    kind: auth.kind,
    dataRoomId,
    viewCount: 0,
    createdAt: now,
  });
}
