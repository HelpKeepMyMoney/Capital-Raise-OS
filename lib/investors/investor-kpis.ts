import type { Investor, PipelineStage } from "@/lib/firestore/types";

export function isInvestorActive(inv: Investor): boolean {
  return inv.crmStatus !== "archived";
}

const ACTIVE_CONVERSATION_STAGES: PipelineStage[] = [
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
];

const WEIGHTED_PIPELINE_STAGES: PipelineStage[] = [
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
  "soft_circled",
];

/** Mirrors server logic in `lib/firestore/queries.ts` for client-side KPIs. */
export function weightedPipelineValueUsd(investors: Investor[]): number {
  const list = investors.filter(isInvestorActive);
  let sum = 0;
  for (const inv of list) {
    if (!WEIGHTED_PIPELINE_STAGES.includes(inv.pipelineStage)) continue;
    const mid =
      inv.checkSizeMin != null && inv.checkSizeMax != null
        ? (inv.checkSizeMin + inv.checkSizeMax) / 2
        : (inv.checkSizeMax ?? inv.checkSizeMin ?? 0);
    if (mid <= 0) continue;
    const score = (inv.relationshipScore ?? 50) / 100;
    sum += mid * Math.min(1, Math.max(0, score));
  }
  return Math.round(sum);
}

export type InvestorKpiTrend = {
  pct: number | null;
  label: string;
};

/** Approximate MoM growth using record creation dates when history is unavailable. */
export function creationGrowthTrend(investors: Investor[], activeOnly = true): InvestorKpiTrend {
  const list = activeOnly ? investors.filter(isInvestorActive) : investors;
  const now = Date.now();
  const d30 = 30 * 86400000;
  const recent = list.filter((i) => i.createdAt >= now - d30).length;
  const prior = list.filter(
    (i) => i.createdAt >= now - 2 * d30 && i.createdAt < now - d30,
  ).length;
  if (prior === 0 && recent === 0) return { pct: null, label: "No prior period data" };
  const pct =
    prior === 0 ? (recent > 0 ? 100 : null) : Math.round(((recent - prior) / prior) * 100);
  return {
    pct,
    label: pct != null ? `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs prior 30 days` : "Net new",
  };
}

export function computeInvestorKpis(investors: Investor[]): {
  totalInvestors: number;
  activeConversations: number;
  weightedPipeline: number;
  hotProspects: number;
  meetingsScheduled: number;
  committedCapital: number;
  totalTrend: InvestorKpiTrend;
} {
  const active = investors.filter(isInvestorActive);
  const activeConversations = active.filter((i) =>
    ACTIVE_CONVERSATION_STAGES.includes(i.pipelineStage),
  ).length;
  const hotProspects = active.filter((i) => (i.relationshipScore ?? 0) >= 80).length;
  const meetingsScheduled = active.filter((i) => i.pipelineStage === "meeting_scheduled").length;
  const committedCapital = active.reduce((s, i) => s + (i.committedAmount ?? 0), 0);

  return {
    totalInvestors: active.length,
    activeConversations,
    weightedPipeline: weightedPipelineValueUsd(investors),
    hotProspects,
    meetingsScheduled,
    committedCapital,
    totalTrend: creationGrowthTrend(investors, true),
  };
}

/** Potential capital using midpoint of check range (Kanban column totals). */
export function stagePotentialCapital(stageInvestors: Investor[]): number {
  let sum = 0;
  for (const inv of stageInvestors) {
    const mid =
      inv.checkSizeMin != null && inv.checkSizeMax != null
        ? (inv.checkSizeMin + inv.checkSizeMax) / 2
        : (inv.checkSizeMax ?? inv.checkSizeMin ?? 0);
    if (mid > 0) sum += mid;
  }
  return Math.round(sum);
}
