import type { Investor } from "@/lib/firestore/types";

/** Full name for UI and activity copy. Prefers first + last; falls back to legacy `name`. */
export function investorDisplayName(inv: Investor): string {
  return investorDisplayNameFromFields({
    firstName: inv.firstName,
    lastName: inv.lastName,
    name: inv.name,
  });
}

export function investorDisplayNameFromFields(i: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): string {
  const f = i.firstName?.trim();
  const l = i.lastName?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return (i.name ?? "").trim() || "Investor";
}

/** Split legacy `name` for forms when `firstName` / `lastName` are not stored. */
export function investorNamePartsForForm(inv: Investor): { firstName: string; lastName: string } {
  if (inv.firstName !== undefined || inv.lastName !== undefined) {
    return {
      firstName: inv.firstName?.trim() ?? "",
      lastName: inv.lastName?.trim() ?? "",
    };
  }
  const full = inv.name?.trim() ?? "";
  if (!full) return { firstName: "", lastName: "" };
  const space = full.indexOf(" ");
  if (space === -1) return { firstName: full, lastName: "" };
  return {
    firstName: full.slice(0, space).trim(),
    lastName: full.slice(space + 1).trim(),
  };
}

/** Directory-style "Last, First" for lists (same name sources as investorDisplayName). */
export function investorLastFirstName(inv: Investor): string {
  const { firstName, lastName } = investorNamePartsForForm(inv);
  const f = firstName.trim();
  const l = lastName.trim();
  if (l && f) return `${l}, ${f}`;
  if (l) return l;
  if (f) return f;
  return (inv.name ?? "").trim() || "Investor";
}

/** Sort key: last name, then first (localeCompare). */
export function compareInvestorsByLastFirst(a: Investor, b: Investor): number {
  const pa = investorNamePartsForForm(a);
  const pb = investorNamePartsForForm(b);
  const la = pa.lastName.toLowerCase();
  const lb = pb.lastName.toLowerCase();
  const fa = pa.firstName.toLowerCase();
  const fb = pb.firstName.toLowerCase();
  const lastCmp = la.localeCompare(lb);
  if (lastCmp !== 0) return lastCmp;
  return fa.localeCompare(fb);
}

export function buildInvestorFullName(firstName: string, lastName: string | null | undefined): string {
  return [firstName.trim(), (lastName ?? "").trim()].filter(Boolean).join(" ");
}
