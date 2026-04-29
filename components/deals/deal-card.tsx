"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LineChart, Pencil, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtUsd, computeProgressPct } from "@/lib/deals/format";
import type { Deal, DealStatus } from "@/lib/firestore/types";

export type DealCardMetrics = {
  raised: number;
  interestCount: number;
};

function statusBadgeVariant(status: DealStatus) {
  if (status === "closed" || status === "cancelled") return "destructive" as const;
  if (status === "closing") return "secondary" as const;
  return "default" as const;
}

function daysLabel(closeDate: number | undefined, nowMs: number): string | null {
  if (closeDate == null) return null;
  const d = Math.ceil((closeDate - nowMs) / 86400000);
  if (d < 0) return `Closed ${Math.abs(d)}d ago`;
  return `${d} days left`;
}

export function DealCard(props: {
  deal: Deal;
  metrics: DealCardMetrics;
  canManage: boolean;
  showExpressInterest?: boolean;
  expressInterestSlot?: ReactNode;
}) {
  const [nowMs] = React.useState(() => Date.now());
  const { deal: d, metrics } = props;
  const target = d.targetRaise ?? 0;
  const pct = computeProgressPct(metrics.raised, target);
  const days = daysLabel(d.closeDate, nowMs);
  const urgent =
    d.closeDate != null &&
    Math.ceil((d.closeDate - nowMs) / 86400000) <= 7 &&
    d.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className={cn(
        "group rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        d.status === "closed" && "opacity-90",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/deals/${d.id}`}
              className="font-heading text-lg font-semibold tracking-tight text-foreground hover:text-blue-600"
            >
              {d.name}
            </Link>
            <Badge
              variant={statusBadgeVariant(d.status)}
              className="shrink-0 capitalize shadow-none"
            >
              {d.status}
            </Badge>
            {urgent ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              >
                Closing soon
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium capitalize text-muted-foreground">
            {d.type.replace(/_/g, " ")}
            {d.industry ? ` · ${d.industry}` : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/90">
            {target > 0 ? (
              <span>
                <span className="font-semibold tabular-nums">{fmtUsd(metrics.raised)}</span>
                <span className="text-muted-foreground"> raised of </span>
                <span className="font-medium tabular-nums">{fmtUsd(target)}</span>
              </span>
            ) : metrics.raised > 0 ? (
              <span className="font-semibold tabular-nums">{fmtUsd(metrics.raised)} raised</span>
            ) : null}
            {target > 0 ? (
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{pct}% funded</span>
            ) : null}
            {d.minimumInvestment != null ? (
              <span className="text-muted-foreground">Min {fmtUsd(d.minimumInvestment)}</span>
            ) : null}
            {days ? (
              <span className={urgent ? "font-medium text-amber-700 dark:text-amber-300" : ""}>
                {days}
              </span>
            ) : null}
            <span className="text-muted-foreground">
              {metrics.interestCount} interested
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Link href={`/deals/${d.id}`} className={cn(buttonVariants({ size: "sm" }), "rounded-xl shadow-sm")}>
              View deal
              <ArrowRight className="ml-1 size-4" />
            </Link>
            {props.canManage ? (
              <>
                <Link
                  href={`/deals/${d.id}?tab=settings`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
                >
                  <Pencil className="mr-1 size-4" />
                  Edit
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/deals/${d.id}` : "";
                    if (url) void navigator.clipboard.writeText(url);
                  }}
                >
                  <Share2 className="mr-1 size-4" />
                  Share
                </Button>
                <Link
                  href="/analytics"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}
                >
                  <LineChart className="mr-1 size-4" />
                  Analytics
                </Link>
              </>
            ) : null}
            {props.showExpressInterest ? props.expressInterestSlot : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
