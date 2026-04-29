import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { RoomDocument } from "@/lib/firestore/types";

const MAX_BYTES = 50 * 1024 * 1024;
const KINDS: RoomDocument["kind"][] = ["deck", "model", "ppm", "video", "legal", "other"];

function safeFileName(name: string): string {
  const base = name
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\- ()[\]]/g, "_")
    .slice(0, 180);
  return base.length ? base : "file";
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const dataRoomIdRaw = formData.get("dataRoomId");
  const dataRoomId = typeof dataRoomIdRaw === "string" ? dataRoomIdRaw.trim() : "";
  if (!dataRoomId) {
    return NextResponse.json({ error: "dataRoomId required" }, { status: 400 });
  }

  const kindRaw = formData.get("kind");
  const kind = typeof kindRaw === "string" ? kindRaw : "other";
  if (!KINDS.includes(kind as RoomDocument["kind"])) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const roomSnap = await db.collection(col.dataRooms).doc(dataRoomId).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const room = roomSnap.data() as { organizationId?: string };
  if (room.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const docId = randomUUID();
  const safe = safeFileName(file.name);
  const storagePath = `orgs/${ctx.orgId}/data_rooms/${dataRoomId}/${docId}_${safe}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const bucket = getAdminBucket();
  await bucket.file(storagePath).save(buf, {
    contentType: file.type || "application/octet-stream",
    resumable: false,
  });

  const now = Date.now();
  const displayName = file.name.trim() || safe;

  await db.collection(col.documents).doc(docId).set({
    id: docId,
    organizationId: ctx.orgId,
    dataRoomId,
    name: displayName,
    storagePath,
    kind,
    viewCount: 0,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    createdByUid: ctx.user.uid,
    version: 1,
    createdAt: now,
  });

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.upload",
    resource: `${col.documents}/${docId}`,
    payload: { dataRoomId, kind, name: displayName },
  });

  return NextResponse.json({
    id: docId,
    name: displayName,
    kind,
    dataRoomId,
    viewCount: 0,
    createdAt: now,
  });
}
