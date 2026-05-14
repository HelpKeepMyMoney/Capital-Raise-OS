import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";

export function roomNdaInvestorRequestDocId(organizationId: string, roomId: string, investorUid: string): string {
  return `${organizationId}__${roomId}__${investorUid}`;
}

/** Latest “request NDA” click per room for this investor (server-only collection). */
export async function fetchInvestorNdaRequestTimestamps(
  db: Firestore,
  organizationId: string,
  investorUid: string,
  roomIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (roomIds.length === 0) return out;

  const pairs = roomIds.map((roomId) => ({
    roomId,
    ref: db
      .collection(col.roomNdaInvestorRequests)
      .doc(roomNdaInvestorRequestDocId(organizationId, roomId, investorUid)),
  }));

  const chunk = 30;
  for (let i = 0; i < pairs.length; i += chunk) {
    const batch = pairs.slice(i, i + chunk);
    const snaps = await db.getAll(...batch.map((p) => p.ref));
    for (let j = 0; j < snaps.length; j++) {
      const s = snaps[j];
      const roomId = batch[j]!.roomId;
      if (!s.exists) continue;
      const last = (s.data() as { lastRequestedAt?: unknown }).lastRequestedAt;
      if (typeof last === "number" && last > 0) out.set(roomId, last);
    }
  }
  return out;
}
