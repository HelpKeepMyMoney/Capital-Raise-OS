import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { RoomDocument } from "@/lib/firestore/types";

const KINDS: RoomDocument["kind"][] = ["deck", "model", "ppm", "video", "legal", "other"];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId } = await context.params;
  const body = (await req.json()) as {
    name?: string;
    dataRoomId?: string;
    kind?: string;
  };

  const db = getAdminFirestore();
  const ref = db.collection(col.documents).doc(documentId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data() as {
    organizationId?: string;
    dataRoomId?: string;
    storagePath?: string;
    name?: string;
    kind?: string;
  };
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!data.storagePath) {
    return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = name;
  }

  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !KINDS.includes(body.kind as RoomDocument["kind"])) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    updates.kind = body.kind;
  }

  let newStoragePath = data.storagePath;

  if (body.dataRoomId !== undefined) {
    if (typeof body.dataRoomId !== "string" || !body.dataRoomId.trim()) {
      return NextResponse.json({ error: "Invalid dataRoomId" }, { status: 400 });
    }
    const nextRoomId = body.dataRoomId.trim();
    if (nextRoomId !== data.dataRoomId) {
      const roomSnap = await db.collection(col.dataRooms).doc(nextRoomId).get();
      if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      const room = roomSnap.data() as { organizationId?: string };
      if (room.organizationId !== ctx.orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const segment = data.storagePath.split("/").pop();
      if (!segment) return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
      newStoragePath = `orgs/${ctx.orgId}/data_rooms/${nextRoomId}/${segment}`;

      const bucket = getAdminBucket();
      const src = bucket.file(data.storagePath);
      await src.copy(bucket.file(newStoragePath));
      await src.delete({ ignoreNotFound: true });

      updates.dataRoomId = nextRoomId;
      updates.storagePath = newStoragePath;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  await ref.update(updates);

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.document_update",
    resource: `${col.documents}/${documentId}`,
    payload: updates,
  });

  return NextResponse.json({ ok: true, id: documentId, ...updates });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId } = await context.params;

  const db = getAdminFirestore();
  const ref = db.collection(col.documents).doc(documentId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data() as { organizationId?: string; storagePath?: string; name?: string };
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (data.storagePath) {
    const bucket = getAdminBucket();
    await bucket.file(data.storagePath).delete({ ignoreNotFound: true });
  }

  await ref.delete();

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.document_delete",
    resource: `${col.documents}/${documentId}`,
    payload: { name: data.name },
  });

  return NextResponse.json({ ok: true });
}
