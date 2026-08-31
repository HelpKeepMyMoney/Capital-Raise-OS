import {
  aggregatePipelineStages,
  qualifiedProspectCount,
} from "@/lib/dashboard/pipeline-aggregate";
import {
  averageDaysToClose,
  listInvestors,
  weightedPipelineValueUsd,
} from "@/lib/firestore/queries";

export type OrgPipelineSummary = {
  investorCount: number;
  activeConversations: number;
  qualifiedProspects: number;
  weightedPipelineUsd: number;
  capitalCommittedUsd: number;
  capitalClosedUsd: number;
  averageDaysToClose: number | null;
  pipelineFunnel: { stage: string; count: number }[];
};

/** Command Center KPI subset for external agents. */
export async function buildOrgPipelineSummary(orgId: string): Promise<OrgPipelineSummary> {
  const investors = await listInvestors(orgId);
  const pipelineAgg = aggregatePipelineStages(investors);
  const activeConversations = investors.filter((i) =>
    ["contacted", "responded", "meeting_scheduled", "data_room_opened", "due_diligence"].includes(
      i.pipelineStage,
    ),
  ).length;
  const committed = investors.reduce((s, i) => s + (i.committedAmount ?? 0), 0);
  const closedCap = investors
    .filter((i) => i.pipelineStage === "closed")
    .reduce((s, i) => s + (i.committedAmount ?? 0), 0);

  return {
    investorCount: investors.length,
    activeConversations,
    qualifiedProspects: qualifiedProspectCount(investors),
    weightedPipelineUsd: weightedPipelineValueUsd(investors),
    capitalCommittedUsd: committed,
    capitalClosedUsd: closedCap,
    averageDaysToClose: averageDaysToClose(investors),
    pipelineFunnel: pipelineAgg.map((s) => ({ stage: s.label, count: s.count })),
  };
}
