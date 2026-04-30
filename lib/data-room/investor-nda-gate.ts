import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";

/** Lowercase trim for matching MNDA request `investorEmail`. */
export function normalizeInvestorEmailForNda(email: string | undefined | null): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Room IDs where this investor has a completed native e-sign NDA for the org, or legacy MNDA row.
 */
export async function listInvestorCompletedNdaRoomIds(
  db: Firestore,
  organizationId: string,
  investorEmailNorm: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!investorEmailNorm) return out;

  const legacy = await db
    .collection(col.mndaSigningRequests)
    .where("organizationId", "==", organizationId)
    .where("investorEmail", "==", investorEmailNorm)
    .where("status", "==", "completed")
    .limit(200)
    .get();

  for (const d of legacy.docs) {
    const dataRoomId = d.data()?.dataRoomId;
    if (typeof dataRoomId === "string" && dataRoomId.length > 0) out.add(dataRoomId);
  }

  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .where("investorEmailNorm", "==", investorEmailNorm)
    .where("status", "==", "completed")
    .limit(200)
    .get();

  for (const d of snap.docs) {
    const x = d.data() as EsignEnvelope;
    if (x.context.kind !== "data_room_nda") continue;
    if (typeof x.context.dataRoomId === "string" && x.context.dataRoomId.length > 0) {
      out.add(x.context.dataRoomId);
    }
  }
  return out;
}

export type InvestorNdaCompletion = {
  envelopeId: string;
  signedAt: number;
};

/** Latest completed native NDA envelope per room for this investor email. */
export async function listInvestorLatestCompletedNdaByRoom(
  db: Firestore,
  organizationId: string,
  investorEmailNorm: string,
): Promise<Map<string, InvestorNdaCompletion>> {
  const out = new Map<string, InvestorNdaCompletion>();
  if (!investorEmailNorm) return out;

  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .where("investorEmailNorm", "==", investorEmailNorm)
    .where("status", "==", "completed")
    .limit(300)
    .get();

  for (const d of snap.docs) {
    const x = d.data() as EsignEnvelope;
    if (x.context.kind !== "data_room_nda") continue;
    const roomId = x.context.dataRoomId;
    if (typeof roomId !== "string" || roomId.length === 0) continue;
    if (!x.finalPdfStoragePath?.trim()) continue;
    const signedAt = x.updatedAt ?? x.lastEventAt ?? x.createdAt ?? 0;
    const prev = out.get(roomId);
    if (!prev || signedAt > prev.signedAt) {
      out.set(roomId, { envelopeId: d.id, signedAt });
    }
  }
  return out;
}
