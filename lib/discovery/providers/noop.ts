import type { DiscoveryFilters, DiscoveryProvider, RankedInvestorCandidate } from "@/lib/discovery/types";

export const noopDiscoveryProvider: DiscoveryProvider = {
  id: "noop",
  async search(query: string, filters: DiscoveryFilters): Promise<RankedInvestorCandidate[]> {
    void query;
    void filters;
    return [];
  },
};
