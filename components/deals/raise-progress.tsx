"use client";

import { motion } from "framer-motion";
import { fmtUsd, computeProgressPct } from "@/lib/deals/format";
import { cn } from "@/lib/utils";

export function RaiseProgress(props: {
  raised: number;
  target: number;
  investorCount: number;
  lastCommitAgo?: string | null;
  className?: string;
}) {
  const { raised, target, investorCount, lastCommitAgo } = props;
  const pct = computeProgressPct(raised, target);
  const displayPct = target > 0 ? pct : raised > 0 ? 100 : 0;

  return (
    <div className={cn("space-y-4", props.className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Raise progress</p>
          <p className="font-heading text-xl font-semibold tabular-nums tracking-tight md:text-2xl">
            {fmtUsd(raised)}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              raised of {fmtUsd(target)} target
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
            {displayPct.toFixed(target > 0 && displayPct < 1 ? 2 : 0)}% funded
          </p>
          <p className="text-xs text-muted-foreground">
            {investorCount} investor{investorCount === 1 ? "" : "s"} committed
            {lastCommitAgo ? ` · Last ${lastCommitAgo}` : ""}
          </p>
        </div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-blue-500"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(100, displayPct)}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
