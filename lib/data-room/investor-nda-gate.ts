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
