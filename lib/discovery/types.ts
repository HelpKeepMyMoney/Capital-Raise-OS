import type { InvestorType, PipelineStage } from "@/lib/firestore/types";

export type DiscoveryFilters = {
  sector?: string;
  stage?: string;
  checkMin?: number;
  checkMax?: number;
  geography?: string;
  investorType?: InvestorType;
  recencyDays?: number;
  warmIntroPossible?: boolean;
};

export type RankedInvestorCandidate = {
  id: string;
  name: string;
  firm?: string;
  email?: string;
  pipelineStage?: PipelineStage;
  investorType?: InvestorType;
  location?: string;
  sources: ("crm" | "enrichment")[];
  aiRankScore: number;
  aiRankReasons: string[];
};

export type DiscoveryProvider = {
  id: string;
  search: (query: string, filters: DiscoveryFilters) => Promise<RankedInvestorCandidate[]>;
};
