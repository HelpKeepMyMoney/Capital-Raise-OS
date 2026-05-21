import type { Investor, OutreachAudienceFilters } from "@/lib/firestore/types";
import { isInvestorActive } from "@/lib/investors/investor-kpis";

const MAX_RECIPIENTS_PER_LAUNCH = 500;

export function applyAudienceFilters(
  investors: Investor[],
  filters: OutreachAudienceFilters,
): Investor[] {
  let list = investors.filter(isInvestorActive);

  if (filters.investorIds?.length) {
    const picked = new Set(filters.investorIds);
    list = list.filter((i) => picked.has(i.id));
    return list.filter((i) => i.email?.trim()).slice(0, MAX_RECIPIENTS_PER_LAUNCH);
  }

  if (filters.investorTypes?.length) {
    const types = new Set(filters.investorTypes);
    list = list.filter((i) => i.investorType && types.has(i.investorType));
  }

  if (filters.sectors?.length) {
    const sectors = filters.sectors.map((s) => s.toLowerCase());
    list = list.filter((i) =>
      (i.preferredSectors ?? []).some((s) => sectors.includes(s.toLowerCase())),
    );
  }

  if (filters.geography?.length) {
    const geo = filters.geography.map((g) => g.toLowerCase());
    list = list.filter((i) => {
      const loc = (i.location ?? i.preferredGeography?.join(" ") ?? "").toLowerCase();
      return geo.some((g) => loc.includes(g));
    });
  }

  if (filters.minimumRelationshipScore != null) {
    const min = filters.minimumRelationshipScore;
    list = list.filter((i) => (i.relationshipScore ?? 0) >= min);
  }

  if (filters.dealIds?.length) {
    const deals = new Set(filters.dealIds);
    list = list.filter((i) =>
      (i.interestedDealIds ?? []).some((id) => deals.has(id)),
    );
  }

  if (filters.pipelineStages?.length) {
    const stages = new Set(filters.pipelineStages);
    list = list.filter((i) => stages.has(i.pipelineStage));
  }

  return list.filter((i) => i.email?.trim()).slice(0, MAX_RECIPIENTS_PER_LAUNCH);
}

export { MAX_RECIPIENTS_PER_LAUNCH };
