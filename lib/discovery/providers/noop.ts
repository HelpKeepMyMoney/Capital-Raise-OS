import type { DiscoveryFilters, DiscoveryProvider, RankedInvestorCandidate } from "@/lib/discovery/types";

export const noopDiscoveryProvider: DiscoveryProvider = {
  id: "noop",
  async search(_query: string, _filters: DiscoveryFilters): Promise<RankedInvestorCandidate[]> {
    return [];
  },
};
