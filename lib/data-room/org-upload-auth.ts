import type { Firestore } from "firebase-admin/firestore";
import type { RoomDocument } from "@/lib/firestore/types";
import { FILE_KINDS } from "@/lib/data-room/folder-helpers";
import { col } from "@/lib/firestore/paths";

export type OrgDataRoomUploadAuth =
  | {
      ok: true;
      kind: RoomDocument["kind"];
      parentFolderId: string | null;
    }
  | { ok: false; status: number; error: string };

/** Org-scoped upload authorization for REST API keys (no user membership). */
export async function authorizeDataRoomFileCreateForOrg(
  db: Firestore,
  orgId: string,
  input: {
    dataRoomId: string;
    kind: string;
    parentFolderId: string | null | undefined;
  },
): Promise<OrgDataRoomUploadAuth> {
  const dataRoomId = input.dataRoomId.trim();
  if (!dataRoomId) {
    return { ok: false, status: 400, error: "dataRoomId required" };
  }

  const kind = typeof input.kind === "string" ? input.kind : "other";
  if (!FILE_KINDS.includes(kind as RoomDocument["kind"])) {
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
