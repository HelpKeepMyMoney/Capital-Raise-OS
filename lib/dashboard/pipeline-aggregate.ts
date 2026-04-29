import type { Investor } from "@/lib/firestore/types";
import { funnelCounts, isInvestorActive } from "@/lib/firestore/queries";

export type PipelineAggregateKey =
  | "lead"
  | "qualified"
  | "meeting"
  | "soft_circle"
  | "committed"
  | "funded"
  | "declined";

export type PipelineAggregateRow = {
  key: PipelineAggregateKey;
  label: string;
  count: number;
  /** % of prior stage count (first stage: 100 if any leads, else null) */
  conversionFromPrior: number | null;
};

const LABELS: Record<PipelineAggregateKey, string> = {
  lead: "Lead",
  qualified: "Qualified",
  meeting: "Meeting",
  soft_circle: "Soft Circle",
  committed: "Committed",
  funded: "Funded",
  declined: "Declined",
};

/** Map granular funnel counts into executive 7-stage pipeline. */
export function aggregatePipelineStages(investors: Investor[]): PipelineAggregateRow[] {
  const granular = funnelCounts(investors, true);
  const byStage = Object.fromEntries(granular.map((g) => [g.stage, g.count])) as Record<
    string,
    number
  >;

  const lead =
    (byStage.lead ?? 0) +
    (byStage.researching ?? 0);
  const qualified =
    (byStage.contacted ?? 0) +
    (byStage.responded ?? 0) +
    (byStage.data_room_opened ?? 0) +
    (byStage.due_diligence ?? 0);
  const meeting = byStage.meeting_scheduled ?? 0;
  const soft_circle = byStage.soft_circled ?? 0;
  const committed = byStage.committed ?? 0;
  const funded = byStage.closed ?? 0;
  const declined = byStage.declined ?? 0;

  const raw: { key: PipelineAggregateKey; count: number }[] = [
    { key: "lead", count: lead },
    { key: "qualified", count: qualified },
    { key: "meeting", count: meeting },
    { key: "soft_circle", count: soft_circle },
    { key: "committed", count: committed },
    { key: "funded", count: funded },
    { key: "declined", count: declined },
  ];

  const rows: PipelineAggregateRow[] = raw.map((r, i) => {
    let conversionFromPrior: number | null = null;
    if (i === 0) {
      conversionFromPrior = r.count > 0 ? 100 : null;
    } else {
      const prev = raw[i - 1]!.count;
      if (prev > 0) conversionFromPrior = Math.round((r.count / prev) * 1000) / 10;
    }
    return {
      key: r.key,
      label: LABELS[r.key],
      count: r.count,
      conversionFromPrior,
    };
  });

  return rows;
}

/** Investors in weighted-pipeline stages (for KPI micro-copy). */
export function qualifiedProspectCount(investors: Investor[]): number {
  const stages = new Set([
    "contacted",
    "responded",
    "meeting_scheduled",
    "data_room_opened",
    "due_diligence",
    "soft_circled",
  ]);
  return investors.filter((i) => isInvestorActive(i) && stages.has(i.pipelineStage)).length;
}
