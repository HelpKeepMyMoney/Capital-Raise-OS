import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import {
  DATA_ROOM_UPLOAD_MAX_BYTES,
  dataRoomStorageObjectPath,
  authorizeDataRoomFileCreate,
} from "@/lib/data-room/data-room-upload";

type Body = {
  dataRoomId?: string;
  kind?: string;
  parentFolderId?: string | null;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
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

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  if (!fileName) {
    return NextResponse.json({ error: "fileName required" }, { status: 400 });
  }

  const sizeBytes = typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes) ? body.sizeBytes : -1;
  if (sizeBytes <= 0) {
    return NextResponse.json({ error: "sizeBytes required" }, { status: 400 });
  }
  if (sizeBytes > DATA_ROOM_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const contentType =
    typeof body.contentType === "string" && body.contentType.trim()
      ? body.contentType.trim().slice(0, 200)
      : "application/octet-stream";

  const db = getAdminFirestore();
  const auth = await authorizeDataRoomFileCreate(db, ctx.orgId, ctx.user.uid, {
    dataRoomId: typeof body.dataRoomId === "string" ? body.dataRoomId : "",
    kind: typeof body.kind === "string" ? body.kind : "other",
    parentFolderId: body.parentFolderId,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const dataRoomId = (typeof body.dataRoomId === "string" ? body.dataRoomId : "").trim();
  const docId = randomUUID();
  const storagePath = dataRoomStorageObjectPath(ctx.orgId, dataRoomId, docId, fileName);

  const bucket = getAdminBucket();
  const file = bucket.file(storagePath);
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 20 * 60 * 1000,
    contentType,
  });

  return NextResponse.json({
    docId,
    uploadUrl,
    contentType,
  });
}
