import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

/** Rooms tagged with any of the given deal ids (typically one deal per invite). */
export async function listDataRoomIdsForDeals(
  organizationId: string,
  dealIds: string[],
): Promise<string[]> {
  if (dealIds.length === 0) return [];
  const db = getAdminFirestore();
  const rooms = new Set<string>();
  for (const dealId of dealIds) {
    const snap = await db
      .collection(col.dataRooms)
      .where("organizationId", "==", organizationId)
      .where("dealId", "==", dealId)
      .get();
    for (const d of snap.docs) rooms.add(d.id);
  }
  return [...rooms];
}
