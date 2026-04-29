import type { InvestorAccess } from "@/lib/firestore/types";

export type MembershipForAccess =
  | { role: string; investorAccess?: InvestorAccess }
  | null
  | undefined;

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
): boolean {
  if (!membership || membership.role !== "investor_guest") return true;
  const ia = membership.investorAccess;
  if (!ia) return false;
  if (ia.scope === "org") return true;
  return ia.dataRoomIds.includes(roomId);
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

export function filterDataRoomsForMember<T extends { id: string }>(
  rooms: T[],
  membership: MembershipForAccess,
): T[] {
  if (!membership || membership.role !== "investor_guest") return rooms;
  const ia = membership.investorAccess;
  if (!ia || ia.scope === "org") return rooms;
  const allowed = new Set(ia.dataRoomIds);
  return rooms.filter((r) => allowed.has(r.id));
}

export function filterDocumentsForMember<T extends { id: string; dataRoomId?: string }>(
  documents: T[],
  membership: MembershipForAccess,
): T[] {
  if (!membership || membership.role !== "investor_guest") return documents;
  const ia = membership.investorAccess;
  if (!ia || ia.scope === "org") return documents;
  const allowed = new Set(ia.dataRoomIds);
  return documents.filter((d) => Boolean(d.dataRoomId) && allowed.has(d.dataRoomId!));
}
