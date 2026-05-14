import type { Firestore } from "firebase-admin/firestore";
import { canEditOrgData } from "@/lib/auth/rbac";
import type { RoomDocument } from "@/lib/firestore/types";
import { FILE_KINDS } from "@/lib/data-room/folder-helpers";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";

export const DATA_ROOM_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

const KINDS = FILE_KINDS;

const DOC_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server-generated document ids are UUIDs; reject anything else before using in storage paths. */
export function isSafeDocumentId(id: string): boolean {
  return id.length <= 64 && DOC_ID_RE.test(id);
}

export function safeDataRoomFileName(name: string): string {
  const base = name
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\- ()[\]]/g, "_")
    .slice(0, 180);
  return base.length ? base : "file";
}

export function dataRoomStorageObjectPath(
  orgId: string,
  dataRoomId: string,
  docId: string,
  originalFileName: string,
): string {
  const safe = safeDataRoomFileName(originalFileName);
  return `orgs/${orgId}/data_rooms/${dataRoomId}/${docId}_${safe}`;
}

export type DataRoomUploadAuth =
  | {
      ok: true;
      kind: RoomDocument["kind"];
      parentFolderId: string | null;
    }
  | { ok: false; status: number; error: string };

/** Shared checks for creating a file row in a room (used by prepare + finalize). */
export async function authorizeDataRoomFileCreate(
  db: Firestore,
  orgId: string,
  userUid: string,
  input: {
    dataRoomId: string;
    kind: string;
    parentFolderId: string | null | undefined;
  },
): Promise<DataRoomUploadAuth> {
  const m = await getMembership(orgId, userUid);
  if (!m || !canEditOrgData(m.role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const dataRoomId = input.dataRoomId.trim();
  if (!dataRoomId) {
    return { ok: false, status: 400, error: "dataRoomId required" };
  }

  const kind = typeof input.kind === "string" ? input.kind : "other";
  if (!KINDS.includes(kind as RoomDocument["kind"])) {
    return { ok: false, status: 400, error: "Invalid kind" };
  }

  const roomSnap = await db.collection(col.dataRooms).doc(dataRoomId).get();
  if (!roomSnap.exists) return { ok: false, status: 404, error: "Room not found" };
  const room = roomSnap.data() as { organizationId?: string };
  if (room.organizationId !== orgId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const parentFolderId =
    typeof input.parentFolderId === "string" && input.parentFolderId.trim()
      ? input.parentFolderId.trim()
      : null;

  if (parentFolderId) {
    const parentSnap = await db.collection(col.documents).doc(parentFolderId).get();
    if (!parentSnap.exists) return { ok: false, status: 404, error: "Parent folder not found" };
    const pdata = parentSnap.data() as { organizationId?: string; dataRoomId?: string; kind?: string };
    if (pdata.organizationId !== orgId) return { ok: false, status: 403, error: "Forbidden" };
    if (pdata.dataRoomId !== dataRoomId) {
      return { ok: false, status: 400, error: "Parent folder is not in this room" };
    }
    if (pdata.kind !== "folder") return { ok: false, status: 400, error: "Invalid parent folder" };
  }

  return { ok: true, kind: kind as RoomDocument["kind"], parentFolderId };
}
