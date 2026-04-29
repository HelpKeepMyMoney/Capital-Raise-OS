import { UserRoleSchema, type UserRole } from "@/lib/firestore/types";

const rank: Record<UserRole, number> = {
  investor_guest: 0,
  assistant: 1,
  analyst: 2,
  fund_manager: 3,
  sponsor: 4,
  founder: 5,
  admin: 6,
};

function parseOrgRole(roleStr: string): UserRole | null {
  const p = UserRoleSchema.safeParse(roleStr);
  return p.success ? p.data : null;
}

/** Writable CRM / tasks / deals (not read-only guest portal). */
export function canEditOrgData(roleStr: string): boolean {
  const r = parseOrgRole(roleStr);
  return r != null && canEditInvestors(r);
}

/** Readable label for organization switcher UI. */
export function formatOrganizationRole(roleStr: string): string {
  if (roleStr === "investor_guest") return "Investor";
  return roleStr
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function canManageBilling(role: UserRole) {
  return rank[role] >= rank.fund_manager;
}

export function canManageUsers(role: UserRole) {
  return rank[role] >= rank.admin;
}

/** Org display name / slug in Settings (founder + admin only). */
export function canEditOrganizationProfile(role: UserRole): boolean {
  return rank[role] >= rank.founder;
}

/** Membership role string → same check as `canEditOrganizationProfile`. */
export function canEditOrganizationProfileRole(roleStr: string): boolean {
  const r = parseOrgRole(roleStr);
  return r != null && canEditOrganizationProfile(r);
}

/** Permanently delete the workspace (Settings UI + API). Founder or org admin only. */
export function canDeleteOrganization(role: UserRole): boolean {
  return rank[role] >= rank.founder;
}

export function canDeleteOrganizationRole(roleStr: string): boolean {
  const r = parseOrgRole(roleStr);
  return r != null && canDeleteOrganization(r);
}

export function canEditInvestors(role: UserRole) {
  return role !== "investor_guest";
}

export function isInvestorGuestRole(roleStr: string): boolean {
  return parseOrgRole(roleStr) === "investor_guest";
}

export function roleFromClaims(orgs: Record<string, string> | undefined, orgId: string): UserRole | null {
  if (!orgs || !orgId) return null;
  const r = orgs[orgId];
  if (!r) return null;
  return parseOrgRole(r);
}
