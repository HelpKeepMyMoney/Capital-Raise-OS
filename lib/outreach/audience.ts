import type { OutreachAudienceFilters } from "@/lib/firestore/types";

export type { OutreachAudienceFilters };

export type CampaignAudienceMode = "all" | "deal_interest" | "hand_picked";

export type OutreachInvestorOption = {
  id: string;
  name: string;
  email?: string;
  firm?: string;
};

export function getCampaignAudienceMode(
  filters: OutreachAudienceFilters,
  relatedDealId?: string,
): CampaignAudienceMode {
  if (filters.investorIds?.length) return "hand_picked";
  if (
    relatedDealId &&
    filters.dealIds?.length === 1 &&
    filters.dealIds[0] === relatedDealId
  ) {
    return "deal_interest";
  }
  return "all";
}

export function buildCampaignAudienceFilters(
  mode: CampaignAudienceMode,
  opts: { relatedDealId?: string; investorIds?: string[] },
): OutreachAudienceFilters {
  if (mode === "hand_picked") {
    const investorIds = [...new Set(opts.investorIds ?? [])].filter(Boolean).slice(0, 500);
    return investorIds.length ? { investorIds } : {};
  }
  if (mode === "deal_interest" && opts.relatedDealId) {
    return { dealIds: [opts.relatedDealId] };
  }
  return {};
}

function sortOptional(arr?: string[]): string[] | undefined {
  if (!arr?.length) return undefined;
  return [...arr].sort();
}

export function normalizeAudienceFilters(filters: OutreachAudienceFilters): OutreachAudienceFilters {
  const out: OutreachAudienceFilters = {};
  const investorIds = sortOptional(filters.investorIds);
  const dealIds = sortOptional(filters.dealIds);
  const pipelineStages = sortOptional(filters.pipelineStages);
  const investorTypes = sortOptional(filters.investorTypes);
  const sectors = sortOptional(filters.sectors);
  const geography = sortOptional(filters.geography);
  const tags = sortOptional(filters.tags);
  if (investorIds) out.investorIds = investorIds;
  if (dealIds) out.dealIds = dealIds;
  if (pipelineStages) out.pipelineStages = pipelineStages;
  if (investorTypes) out.investorTypes = investorTypes;
  if (sectors) out.sectors = sectors;
  if (geography) out.geography = geography;
  if (tags) out.tags = tags;
  if (filters.minimumRelationshipScore != null) {
    out.minimumRelationshipScore = filters.minimumRelationshipScore;
  }
  return out;
}

export function audienceFiltersEqual(
  a: OutreachAudienceFilters,
  b: OutreachAudienceFilters,
): boolean {
  return (
    JSON.stringify(normalizeAudienceFilters(a)) === JSON.stringify(normalizeAudienceFilters(b))
  );
}
