import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { dataRoomId?: string; name?: string; parentFolderId?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataRoomId = typeof body.dataRoomId === "string" ? body.dataRoomId.trim() : "";
  if (!dataRoomId) return NextResponse.json({ error: "dataRoomId required" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const parentFolderIdRaw = body.parentFolderId;
  const parentFolderId =
    typeof parentFolderIdRaw === "string" && parentFolderIdRaw.trim() ? parentFolderIdRaw.trim() : null;

  const db = getAdminFirestore();
  const roomSnap = await db.collection(col.dataRooms).doc(dataRoomId).get();
  if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const room = roomSnap.data() as { organizationId?: string };
  if (room.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parentFolderId) {
    const parentSnap = await db.collection(col.documents).doc(parentFolderId).get();
    if (!parentSnap.exists) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    const pdata = parentSnap.data() as { organizationId?: string; dataRoomId?: string; kind?: string };
    if (pdata.organizationId !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (pdata.dataRoomId !== dataRoomId) {
      return NextResponse.json({ error: "Parent folder is not in this room" }, { status: 400 });
    }
    if (pdata.kind !== "folder") return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }

  const id = randomUUID();
  const now = Date.now();
  const payload: Record<string, unknown> = {
    id,
    organizationId: ctx.orgId,
    dataRoomId,
    name,
    kind: "folder",
    viewCount: 0,
    version: 1,
    createdByUid: ctx.user.uid,
    createdAt: now,
  };
  if (parentFolderId) payload.parentFolderId = parentFolderId;

  await db.collection(col.documents).doc(id).set(payload);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.folder_create",
    resource: `${col.documents}/${id}`,
    payload: { dataRoomId, name, parentFolderId },
  });

  return NextResponse.json({
    id,
    name,
    kind: "folder" as const,
    dataRoomId,
    parentFolderId: parentFolderId ?? null,
    viewCount: 0,
    createdAt: now,
  });
}
