import { NextRequest, NextResponse } from "next/server";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore, getAdminBucket } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { writeAuditLog } from "@/lib/audit";
import type { RoomDocument } from "@/lib/firestore/types";
import { FILE_KINDS, folderParentWouldCreateCycle, isDataRoomFolderRow } from "@/lib/data-room/folder-helpers";

const KINDS = FILE_KINDS;
const ACCESS: RoomDocument["accessLevel"][] = ["invited", "internal", "vip"];

type DocRow = {
  organizationId?: string;
  dataRoomId?: string;
  storagePath?: string;
  name?: string;
  kind?: string;
  parentFolderId?: string | null;
};

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
    accessLevel?: RoomDocument["accessLevel"];
    version?: number;
    parentFolderId?: string | null;
  };
  const db = getAdminFirestore();
  const ref = db.collection(col.documents).doc(documentId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data() as DocRow;
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isFolder = isDataRoomFolderRow(data);
  if (!isFolder && !data.storagePath) {
    return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = name;
  }

  if (body.kind !== undefined) {
    if (isFolder) {
      return NextResponse.json({ error: "Cannot change folder category" }, { status: 400 });
    }
    if (typeof body.kind !== "string" || !KINDS.includes(body.kind as RoomDocument["kind"])) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    updates.kind = body.kind;
  }

  if (body.accessLevel !== undefined) {
    if (!ACCESS.includes(body.accessLevel)) {
      return NextResponse.json({ error: "Invalid accessLevel" }, { status: 400 });
    }
    updates.accessLevel = body.accessLevel;
  }

  if (body.version !== undefined) {
    if (typeof body.version !== "number" || body.version < 1) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }
    updates.version = body.version;
  }

  let newStoragePath = data.storagePath;

  if (body.dataRoomId !== undefined) {
    if (typeof body.dataRoomId !== "string" || !body.dataRoomId.trim()) {
      return NextResponse.json({ error: "Invalid dataRoomId" }, { status: 400 });
    }
    const nextRoomId = body.dataRoomId.trim();
    if (nextRoomId !== data.dataRoomId) {
      if (isFolder) {
        return NextResponse.json(
          { error: "Move files out of this folder before moving it to another room, or delete and recreate the folder." },
          { status: 400 },
        );
      }
      const roomSnap = await db.collection(col.dataRooms).doc(nextRoomId).get();
      if (!roomSnap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      const room = roomSnap.data() as { organizationId?: string };
      if (room.organizationId !== ctx.orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const segment = data.storagePath!.split("/").pop();
      if (!segment) return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
      newStoragePath = `orgs/${ctx.orgId}/data_rooms/${nextRoomId}/${segment}`;

      const bucket = getAdminBucket();
      const src = bucket.file(data.storagePath!);
      await src.copy(bucket.file(newStoragePath));
      await src.delete({ ignoreNotFound: true });

      updates.dataRoomId = nextRoomId;
      updates.storagePath = newStoragePath;
      updates.parentFolderId = null;
    }
  }

  if (body.parentFolderId !== undefined && !isFolder) {
    const raw = body.parentFolderId;
    const nextParent =
      raw === null || raw === ""
        ? null
        : typeof raw === "string" && raw.trim()
          ? raw.trim()
          : null;
    const roomId = (updates.dataRoomId as string | undefined) ?? data.dataRoomId ?? "";
    if (!roomId) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    if (nextParent) {
      const parentSnap = await db.collection(col.documents).doc(nextParent).get();
      if (!parentSnap.exists) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      const pdata = parentSnap.data() as DocRow;
      if (pdata.organizationId !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (pdata.dataRoomId !== roomId) {
        return NextResponse.json({ error: "Parent folder is not in this room" }, { status: 400 });
      }
      if (pdata.kind !== "folder") return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }
    updates.parentFolderId = nextParent;
  }

  if (body.parentFolderId !== undefined && isFolder) {
    const raw = body.parentFolderId;
    const nextParent =
      raw === null || raw === ""
        ? null
        : typeof raw === "string" && raw.trim()
          ? raw.trim()
          : null;
    const roomId = (updates.dataRoomId as string | undefined) ?? data.dataRoomId ?? "";
    if (!roomId) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    if (nextParent) {
      const parentSnap = await db.collection(col.documents).doc(nextParent).get();
      if (!parentSnap.exists) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      const pdata = parentSnap.data() as DocRow;
      if (pdata.organizationId !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (pdata.dataRoomId !== roomId) {
        return NextResponse.json({ error: "Parent folder is not in this room" }, { status: 400 });
      }
      if (pdata.kind !== "folder") return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
      if (await folderParentWouldCreateCycle(db, documentId, nextParent)) {
        return NextResponse.json({ error: "Cannot move a folder into itself or its descendants" }, { status: 400 });
      }
    }
    updates.parentFolderId = nextParent;
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

  const data = snap.data() as DocRow & { name?: string };
  if (data.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isFolder = isDataRoomFolderRow(data);

  if (isFolder) {
    const inheritParent = data.parentFolderId ?? null;
    const childrenSnap = await db.collection(col.documents).where("parentFolderId", "==", documentId).get();
    const batchSize = 400;
    let batch = db.batch();
    let n = 0;
    for (const ch of childrenSnap.docs) {
      batch.update(ch.ref, { parentFolderId: inheritParent });
      n += 1;
      if (n >= batchSize) {
        await batch.commit();
        batch = db.batch();
        n = 0;
      }
    }
    if (n > 0) await batch.commit();
  } else if (data.storagePath) {
    const bucket = getAdminBucket();
    await bucket.file(data.storagePath).delete({ ignoreNotFound: true });
  }

  await ref.delete();

  await writeAuditLog({
    organizationId: ctx.orgId,
    actorId: ctx.user.uid,
    action: "data_room.document_delete",
    resource: `${col.documents}/${documentId}`,
    payload: { name: data.name, folder: isFolder },
  });

  return NextResponse.json({ ok: true });
}
