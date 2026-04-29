import type { Deal, DealWhyInvestBlock } from "@/lib/firestore/types";

/** Firestore field keys + titles for investor-facing Why invest cards (fixed six). */
export const WHY_INVEST_NARRATIVE_FIELD_DEFS = [
  { key: "marketOpportunity", title: "Market opportunity" },
  { key: "problem", title: "Problem" },
  { key: "solution", title: "Solution" },
  { key: "competitiveEdge", title: "Competitive edge" },
  { key: "growthStrategy", title: "Growth strategy" },
  { key: "exitPotential", title: "Exit potential" },
] as const;

export type WhyInvestNarrativeFieldKey = (typeof WHY_INVEST_NARRATIVE_FIELD_DEFS)[number]["key"];

/** Narrative object sent to WhyInvest when `deal.whyInvest` is not used. */
export type WhyInvestNarrative = Partial<Record<WhyInvestNarrativeFieldKey, string>>;

export function blocksFromNarrative(narrative: WhyInvestNarrative | undefined): DealWhyInvestBlock[] {
  if (!narrative) return [];
  const out: DealWhyInvestBlock[] = [];
  for (const { key, title } of WHY_INVEST_NARRATIVE_FIELD_DEFS) {
    const body = narrative[key]?.trim() ?? "";
    if (body.length > 0) out.push({ title, body });
  }
  return out;
}

export function hasWhyInvestNarrativeOnDeal(
  deal: Pick<Deal, WhyInvestNarrativeFieldKey | "whyInvest">,
): boolean {
  if (deal.whyInvest?.some((b) => b.title.trim() && b.body.trim())) return true;
  for (const { key } of WHY_INVEST_NARRATIVE_FIELD_DEFS) {
    if ((deal[key] as string | undefined)?.trim()) return true;
  }
  return false;
}

export function pickWhyInvestNarrative(deal: Deal): WhyInvestNarrative {
  const n: WhyInvestNarrative = {};
  for (const { key } of WHY_INVEST_NARRATIVE_FIELD_DEFS) {
    const v = deal[key] as string | undefined;
    if (v != null && v !== "") n[key] = v;
  }
  return n;
}
