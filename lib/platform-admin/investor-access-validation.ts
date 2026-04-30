import type { InvestorAccess } from "@/lib/firestore/types";
import { listDeals, listDataRoomsForOrganization } from "@/lib/firestore/queries";

/**
 * Validates `investor_guest` investorAccess against org-owned deals/data rooms.
 * Returns an error message or null when valid.
 */
export async function validateInvestorGuestAccess(
  organizationId: string,
  access: InvestorAccess,
): Promise<string | null> {
  if (access.scope === "org") return null;

  const deals = await listDeals(organizationId);
  const dealIdSet = new Set(deals.map((d) => d.id));
  for (const did of access.dealIds) {
    if (!dealIdSet.has(did)) {
      return `Deal "${did}" does not belong to this organization`;
    }
  }

  const allowedDealIds = new Set(access.dealIds);
  const rooms = await listDataRoomsForOrganization(organizationId, 300);
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  for (const rid of access.dataRoomIds) {
    const room = roomMap.get(rid);
    if (!room) {
      return `Data room "${rid}" does not belong to this organization`;
    }
    const roomDeal = room.dealId;
    if (!roomDeal || !allowedDealIds.has(roomDeal)) {
      return `Data room "${rid}" must be tied to one of the selected deals`;
    }
  }

  return null;
}
