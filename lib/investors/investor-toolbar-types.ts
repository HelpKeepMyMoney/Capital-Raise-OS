import type { InvestorType, PipelineStage, WarmCold } from "@/lib/firestore/types";

export const FILTER_UNSET = "__unset__" as const;

export type LastActivityFilter = "any" | "d7" | "d30" | "d90" | "never";

export type InvestorToolbarState = {
  search: string;
  savedPresetId: string;
  filterStage: PipelineStage | "all";
  filterType: InvestorType | "all" | typeof FILTER_UNSET;
  filterWarmth: WarmCold | "all" | typeof FILTER_UNSET;
  filterOwnerUserId: string | "all" | "__unassigned__";
  filterCheck: "any" | "25k_100k" | "100k_500k" | "500k_1m" | "1m_plus";
  filterLastActivity: LastActivityFilter;
  filterDealId: string | "all";
  activeConversationOnly: boolean;
};

export const DEFAULT_INVESTOR_TOOLBAR_STATE: InvestorToolbarState = {
  search: "",
  savedPresetId: "",
  filterStage: "all",
  filterType: "all",
  filterWarmth: "all",
  filterOwnerUserId: "all",
  filterCheck: "any",
  filterLastActivity: "any",
  filterDealId: "all",
  activeConversationOnly: false,
};
