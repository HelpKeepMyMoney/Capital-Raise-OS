"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Investor, PipelineStage } from "@/lib/firestore/types";
import { PIPELINE_STAGES, pipelineStageShortLabel } from "@/lib/investors/form-options";
import { stagePotentialCapital } from "@/lib/investors/investor-kpis";
import { cn } from "@/lib/utils";
import { InvestorCard } from "@/components/investors/InvestorCard";

function fmtUsdCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

export function KanbanBoard(props: {
  grouped: Map<PipelineStage, Investor[]>;
  canManage: boolean;
  ownerLabel: (uid: string | undefined) => string;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onArchive: (id: string, archived: boolean) => void;
  onNoteQuick?: (inv: Investor) => void;
  className?: string;
}) {
  function onColumnDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-4 pt-1", props.className)}>
      {PIPELINE_STAGES.map((stage) => {
        const column = props.grouped.get(stage) ?? [];
        const potential = stagePotentialCapital(column);
        return (
          <div
            key={stage}
            className="flex min-w-[272px] max-w-[300px] flex-1 flex-col rounded-2xl border border-border/60 bg-muted/20 shadow-inner"
            onDragOver={props.canManage ? onColumnDragOver : undefined}
            onDrop={
              props.canManage
                ? (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("application/investor-id");
                    if (id) props.onStageChange(id, stage);
                  }
                : undefined
            }
          >
            <div className="border-b border-border/60 bg-card/80 px-3 py-3 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold leading-tight text-foreground">
                    {pipelineStageShortLabel(stage)}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {column.length} investor{column.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-[11px] tabular-nums">
                  {potential > 0 ? `${fmtUsdCompact(potential)} potential` : "—"}
                </Badge>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-22rem)] min-h-[320px] pr-2">
              <div className="flex flex-col gap-2 p-2">
                {column.map((inv) => (
                  <InvestorCard
                    key={inv.id}
                    investor={inv}
                    canManage={props.canManage}
                    ownerLabel={props.ownerLabel(inv.relationshipOwnerUserId)}
                    onStageChange={props.onStageChange}
                    onArchive={props.onArchive}
                    onNoteQuick={props.onNoteQuick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
