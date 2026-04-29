"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Investor } from "@/lib/firestore/types";
import { investorLastFirstName } from "@/lib/investors/display-name";
import { investorSegmentLabel } from "@/lib/investors/crm-labels";
import { pipelineStageShortLabel } from "@/lib/investors/form-options";
import { cn } from "@/lib/utils";

export function InvestorListView(props: {
  investors: Investor[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/70 rounded-2xl border border-border/70 bg-card shadow-sm", props.className)}>
      {props.investors.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">No investors match your filters.</p>
      ) : (
        props.investors.map((inv) => (
          <Link
            key={inv.id}
            href={`/investors/${inv.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold leading-tight">{investorLastFirstName(inv)}</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {pipelineStageShortLabel(inv.pipelineStage)}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {inv.firm ?? "No firm"} · {investorSegmentLabel(inv)}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-50" />
          </Link>
        ))
      )}
    </div>
  );
}
