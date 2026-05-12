import type { Firestore } from "firebase-admin/firestore";
import type { RoomDocument } from "@/lib/firestore/types";
import { col } from "@/lib/firestore/paths";

export function isDataRoomFolderRow(d: { kind?: string }): boolean {
  return d.kind === "folder";
}

export function isDataRoomFileRow(d: { kind?: string; storagePath?: string }): boolean {
  return !isDataRoomFolderRow(d) && Boolean(d.storagePath);
}

export const FILE_KINDS: RoomDocument["kind"][] = ["deck", "model", "ppm", "video", "legal", "other"];

/** True if assigning `newParentId` as parent of `movingFolderId` would create a cycle. */
export async function folderParentWouldCreateCycle(
  db: Firestore,
  movingFolderId: string,
  newParentId: string | null,
): Promise<boolean> {
  if (!newParentId) return false;
  let cur: string | null = newParentId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === movingFolderId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    const snap = await db.collection(col.documents).doc(cur).get();
    const raw = snap.data()?.parentFolderId;
    cur = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  return false;
}
