import type { Investor } from "@/lib/firestore/types";
import { investorDisplayName } from "@/lib/investors/display-name";

export type InvestorDiscoverySearchField = {
  label: string;
  hay: string;
  weight: number;
};

function lower(value: string | number | undefined | null): string {
  if (value == null) return "";
  return String(value).toLowerCase().trim();
}

/** Enum / slug values plus spaced variant (e.g. family_office → family office). */
function enumHay(value: string | undefined): string {
  if (!value) return "";
  const base = value.toLowerCase();
  return base.includes("_") ? `${base} ${base.replace(/_/g, " ")}` : base;
}

function joinArray(values: string[] | undefined): string {
  return (values ?? []).map((v) => lower(v)).filter(Boolean).join(" ");
}

function timestampHay(ts: number | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return "";
  try {
    return new Date(ts).toISOString().slice(0, 10);
  } catch {
    return String(ts);
  }
}

/** Profile notes (`notes` + `notesSummary`), deduped when identical. */
export function investorNotesText(inv: Investor): string {
  const parts: string[] = [];
  for (const value of [inv.notes, inv.notesSummary]) {
    const t = (value ?? "").trim();
    if (!t || parts.includes(t)) continue;
    parts.push(t);
  }
  return parts.join("\n");
}

export type InvestorSearchFieldOptions = {
  /** When a numeric check constraint was parsed, avoid substring matches on checkSizeMin/Max. */
  skipCheckSizeTextMatch?: boolean;
};

/** Per-field searchable text for discovery token matching (all CRM investor attributes). */
export function getInvestorDiscoverySearchFields(
  inv: Investor,
  opts?: InvestorSearchFieldOptions,
): InvestorDiscoverySearchField[] {
  const displayName = investorDisplayName(inv);
  const skipCheck = opts?.skipCheckSizeTextMatch ?? false;

  return [
    { label: "name", hay: lower(displayName), weight: 14 },
    { label: "firstName", hay: lower(inv.firstName), weight: 12 },
    { label: "lastName", hay: lower(inv.lastName), weight: 12 },
    { label: "legacyName", hay: lower(inv.name), weight: 11 },
    { label: "firm", hay: lower(inv.firm), weight: 13 },
    { label: "title", hay: lower(inv.title), weight: 10 },
    { label: "email", hay: lower(inv.email), weight: 9 },
    { label: "phone", hay: lower(inv.phone), weight: 7 },
    { label: "website", hay: lower(inv.website), weight: 8 },
    { label: "linkedIn", hay: lower(inv.linkedIn), weight: 8 },
    { label: "location", hay: lower(inv.location), weight: 12 },
    { label: "investorType", hay: enumHay(inv.investorType), weight: 11 },
    ...(skipCheck
      ? []
      : [
          { label: "checkSizeMin", hay: lower(inv.checkSizeMin), weight: 8 },
          { label: "checkSizeMax", hay: lower(inv.checkSizeMax), weight: 8 },
        ]),
    { label: "preferredSectors", hay: joinArray(inv.preferredSectors), weight: 14 },
    { label: "preferredGeography", hay: joinArray(inv.preferredGeography), weight: 11 },
    { label: "stagePreference", hay: joinArray(inv.stagePreference), weight: 12 },
    { label: "warmCold", hay: enumHay(inv.warmCold), weight: 7 },
    { label: "relationshipScore", hay: lower(inv.relationshipScore), weight: 6 },
    { label: "lastContactAt", hay: timestampHay(inv.lastContactAt), weight: 5 },
    { label: "nextFollowUpAt", hay: timestampHay(inv.nextFollowUpAt), weight: 5 },
    { label: "notes", hay: lower(investorNotesText(inv)), weight: 15 },
    { label: "documentsSharedCount", hay: lower(inv.documentsSharedCount), weight: 4 },
    { label: "pipelineStage", hay: enumHay(inv.pipelineStage), weight: 11 },
    { label: "committedAmount", hay: lower(inv.committedAmount), weight: 9 },
    { label: "crmStatus", hay: enumHay(inv.crmStatus), weight: 5 },
    { label: "investProbability", hay: lower(inv.investProbability), weight: 7 },
    { label: "referralSource", hay: lower(inv.referralSource), weight: 9 },
    { label: "interestedDealIds", hay: joinArray(inv.interestedDealIds), weight: 6 },
    { label: "archivedAt", hay: timestampHay(inv.archivedAt), weight: 3 },
    { label: "createdAt", hay: timestampHay(inv.createdAt), weight: 3 },
    { label: "updatedAt", hay: timestampHay(inv.updatedAt), weight: 3 },
  ];
}

/** Combined haystack for phrase-level matching across the full investor record. */
export function buildInvestorDiscoveryHaystack(inv: Investor, opts?: InvestorSearchFieldOptions): string {
  return getInvestorDiscoverySearchFields(inv, opts)
    .map((f) => f.hay)
    .filter(Boolean)
    .join(" ");
}

/** Full investor profile payload for LLM discovery ranking. */
export function serializeInvestorForDiscoveryLlm(inv: Investor) {
  return {
    id: inv.id,
    name: investorDisplayName(inv),
    firstName: inv.firstName,
    lastName: inv.lastName,
    firm: inv.firm,
    title: inv.title,
    email: inv.email,
    phone: inv.phone,
    website: inv.website,
    linkedIn: inv.linkedIn,
    location: inv.location,
    investorType: inv.investorType,
    checkSizeMin: inv.checkSizeMin,
    checkSizeMax: inv.checkSizeMax,
    preferredSectors: inv.preferredSectors,
    preferredGeography: inv.preferredGeography,
    stagePreference: inv.stagePreference,
    warmCold: inv.warmCold,
    relationshipScore: inv.relationshipScore,
    lastContactAt: inv.lastContactAt,
    nextFollowUpAt: inv.nextFollowUpAt,
    notes: inv.notes,
    notesSummary: inv.notesSummary,
    documentsSharedCount: inv.documentsSharedCount,
    pipelineStage: inv.pipelineStage,
    committedAmount: inv.committedAmount,
    crmStatus: inv.crmStatus,
    investProbability: inv.investProbability,
    referralSource: inv.referralSource,
    interestedDealIds: inv.interestedDealIds,
    archivedAt: inv.archivedAt,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}
