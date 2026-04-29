import type { InvestorType, PipelineStage } from "@/lib/firestore/types";

export const PIPELINE_STAGES: PipelineStage[] = [
  "lead",
  "researching",
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
  "soft_circled",
  "committed",
  "closed",
  "declined",
];

export function pipelineStageLabel(s: PipelineStage): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const INVESTOR_TYPE_OPTIONS: { value: InvestorType; label: string }[] = [
  { value: "angel", label: "Angel" },
  { value: "vc", label: "VC" },
  { value: "family_office", label: "Family office" },
  { value: "fund_of_funds", label: "Fund of funds" },
  { value: "corporate", label: "Corporate" },
  { value: "accelerator", label: "Accelerator" },
  { value: "real_estate_lp", label: "Real estate LP" },
  { value: "high_net_worth", label: "HNW" },
  { value: "institutional", label: "Institutional" },
  { value: "other", label: "Other" },
];
