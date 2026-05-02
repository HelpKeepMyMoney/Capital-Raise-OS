import { canEditOrgData } from "@/lib/auth/rbac";
import { memberCanAccessDataRoom } from "@/lib/auth/investor-access";
import { listInvestorCompletedNdaRoomIds, normalizeInvestorEmailForNda } from "@/lib/data-room/investor-nda-gate";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import type { DecodedIdToken } from "firebase-admin/auth";

export type RoomDocumentReadAuth =
  | { ok: true; storagePath: string; name: string; mimeType?: string; dataRoomId: string }
  | { ok: false; status: number; error: string };

export async function authorizeRoomDocumentRead(
  ctx: { user: DecodedIdToken; orgId: string },
  documentId: string,
): Promise<RoomDocumentReadAuth> {
  const db = getAdminFirestore();
  const doc = await db.collection(col.documents).doc(documentId).get();
  if (!doc.exists) return { ok: false, status: 404, error: "Not found" };

  const data = doc.data() as {
    organizationId?: string;
    storagePath?: string;
    name?: string;
    dataRoomId?: string;
    mimeType?: string;
  };
  if (data.organizationId !== ctx.orgId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!data.storagePath) return { ok: false, status: 400, error: "Invalid document" };

  const dataRoomId = typeof data.dataRoomId === "string" ? data.dataRoomId : "";
  if (!dataRoomId) {
    return { ok: false, status: 400, error: "Invalid document" };
  }

  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  if (!membership) return { ok: false, status: 403, error: "Forbidden" };

  if (!canEditOrgData(membership.role)) {
    const roomSnap = await db.collection(col.dataRooms).doc(dataRoomId).get();
    const roomMeta = roomSnap.data() as
      | { organizationId?: string; dealId?: string; ndaRequired?: boolean }
      | undefined;
    if (!roomSnap.exists || roomMeta?.organizationId !== ctx.orgId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (!memberCanAccessDataRoom(membership, dataRoomId, { dealId: roomMeta?.dealId })) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (roomMeta?.ndaRequired) {
      const emailNorm = normalizeInvestorEmailForNda(ctx.user.email ?? "");
      if (!emailNorm) {
        return {
          ok: false,
          status: 403,
          error: "Sign in with an email address to accept the NDA and view documents.",
        };
      }
      const completed = await listInvestorCompletedNdaRoomIds(db, ctx.orgId, emailNorm);
      if (!completed.has(dataRoomId)) {
        return {
          ok: false,
          status: 403,
          error: "You must complete the sponsor’s mutual NDA for this room before viewing documents.",
        };
      }
    }
  }

  return {
    ok: true,
    storagePath: data.storagePath,
    name: typeof data.name === "string" ? data.name : documentId,
    mimeType: typeof data.mimeType === "string" ? data.mimeType : undefined,
    dataRoomId,
  };
}
