import type { UserRole } from "@/lib/firestore/types";

const rank: Record<UserRole, number> = {
  investor_guest: 0,
  assistant: 1,
  analyst: 2,
  fund_manager: 3,
  founder: 4,
  admin: 5,
};

export function canManageBilling(role: UserRole) {
  return rank[role] >= rank.fund_manager;
}

export function canManageUsers(role: UserRole) {
  return rank[role] >= rank.admin;
}

export function canEditInvestors(role: UserRole) {
  return role !== "investor_guest";
}

export function roleFromClaims(orgs: Record<string, string> | undefined, orgId: string): UserRole | null {
  if (!orgs || !orgId) return null;
  const r = orgs[orgId];
  if (!r) return null;
  return r as UserRole;
}
