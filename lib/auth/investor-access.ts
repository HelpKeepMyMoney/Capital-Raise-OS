import type { InvestorAccess } from "@/lib/firestore/types";

export type MembershipForAccess =
  | { role: string; investorAccess?: InvestorAccess }
  | null
  | undefined;

/** Deal-scoped investors see rooms explicitly listed and any room linked to an allowed deal. */
export function dealScopedVisibleRoomIds(
  rooms: { id: string; dealId?: string }[],
  ia: Extract<InvestorAccess, { scope: "deal" }>,
): Set<string> {
  const ids = new Set<string>(ia.dataRoomIds);
  const deals = new Set(ia.dealIds);
  for (const r of rooms) {
    if (r.dealId && deals.has(r.dealId)) ids.add(r.id);
  }
  return ids;
}

/** Non-guest users may access all deals; guests follow invite scope on membership. */
export function memberCanAccessDeal(
  membership: MembershipForAccess,
  dealDocId: string,
): boolean {
  if (!membership || membership.role !== "investor_guest") return true;
  const ia = membership.investorAccess;
  if (!ia) return false;
  if (ia.scope === "org") return true;
  return ia.dealIds.includes(dealDocId);
}

export function memberCanAccessDataRoom(
  membership: MembershipForAccess,
  roomId: string,
  room?: { dealId?: string },
): boolean {
  if (!membership || membership.role !== "investor_guest") return true;
  const ia = membership.investorAccess;
  if (!ia) return false;
  if (ia.scope === "org") return true;
  if (ia.scope === "deal") {
    if (ia.dataRoomIds.includes(roomId)) return true;
    if (room?.dealId && ia.dealIds.includes(room.dealId)) return true;
    return false;
  }
  return false;
}

export function filterDealsForMember<T extends { id: string }>(
  deals: T[],
  membership: MembershipForAccess,
): T[] {
  if (!membership || membership.role !== "investor_guest") return deals;
  const ia = membership.investorAccess;
  if (!ia || ia.scope === "org") return deals;
  const allowed = new Set(ia.dealIds);
  return deals.filter((d) => allowed.has(d.id));
}

export function filterDataRoomsForMember<T extends { id: string; dealId?: string }>(
  rooms: T[],
  membership: MembershipForAccess,
): T[] {
  if (!membership || membership.role !== "investor_guest") return rooms;
  const ia = membership.investorAccess;
  if (!ia || ia.scope === "org") return rooms;
  if (ia.scope === "deal") {
    const visible = dealScopedVisibleRoomIds(rooms, ia);
    return rooms.filter((r) => visible.has(r.id));
  }
  return rooms;
}

/** Pass all org rooms as `allOrgRooms` so documents can inherit deal-linked room access. */
export function filterDocumentsForMember<T extends { id: string; dataRoomId?: string }>(
  documents: T[],
  membership: MembershipForAccess,
  allOrgRooms: { id: string; dealId?: string }[],
): T[] {
  if (!membership || membership.role !== "investor_guest") return documents;
  const ia = membership.investorAccess;
  if (!ia || ia.scope === "org") return documents;
  if (ia.scope === "deal") {
    const visible = dealScopedVisibleRoomIds(allOrgRooms, ia);
    return documents.filter((d) => Boolean(d.dataRoomId) && visible.has(d.dataRoomId!));
  }
  return documents;
}
