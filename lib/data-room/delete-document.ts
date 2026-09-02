import type { Bucket } from "@google-cloud/storage";
import type { Firestore } from "firebase-admin/firestore";
import { isDataRoomFolderRow } from "@/lib/data-room/folder-helpers";
import { col } from "@/lib/firestore/paths";

type DocRow = {
  organizationId?: string;
  dataRoomId?: string;
  storagePath?: string;
  name?: string;
  kind?: string;
  parentFolderId?: string | null;
};

export type DeleteDataRoomDocumentResult =
  | { ok: true; folder: boolean; name?: string }
  | { ok: false; code: "not_found" | "forbidden" };

/**
 * Removes a data-room file or folder. Folders reparent children to the deleted
 * folder's parent. Files delete the Storage object when `storagePath` is set.
 */
export async function deleteDataRoomDocument(input: {
  db: Firestore;
  bucket: Bucket;
  orgId: string;
  documentId: string;
  expectedRoomId?: string;
}): Promise<DeleteDataRoomDocumentResult> {
  const ref = input.db.collection(col.documents).doc(input.documentId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "not_found" };

  const data = snap.data() as DocRow;
  if (data.organizationId !== input.orgId) {
    return { ok: false, code: "forbidden" };
  }
  if (input.expectedRoomId && data.dataRoomId !== input.expectedRoomId) {
    return { ok: false, code: "not_found" };
  }

  const isFolder = isDataRoomFolderRow(data);

  if (isFolder) {
    const inheritParent = data.parentFolderId ?? null;
    const childrenSnap = await input.db
      .collection(col.documents)
      .where("parentFolderId", "==", input.documentId)
      .get();
    const batchSize = 400;
    let batch = input.db.batch();
    let n = 0;
    for (const ch of childrenSnap.docs) {
      batch.update(ch.ref, { parentFolderId: inheritParent });
      n += 1;
      if (n >= batchSize) {
        await batch.commit();
        batch = input.db.batch();
        n = 0;
      }
    }
    if (n > 0) await batch.commit();
  } else if (data.storagePath) {
    await input.bucket.file(data.storagePath).delete({ ignoreNotFound: true });
  }

  await ref.delete();
  return { ok: true, folder: isFolder, name: data.name };
}
